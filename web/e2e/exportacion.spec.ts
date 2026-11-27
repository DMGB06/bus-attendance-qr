import { expect, test, type Page } from "@playwright/test";
import { copyFile, readFile } from "node:fs/promises";
import { loginComoAdmin } from "./helpers/login";
import { sql } from "./helpers/db";

const prefijo = "45000000-0000-0000-1000-";
const bus = prefijo + "000000000001";
const alumno = prefijo + "000000000002";
const otro = prefijo + "000000000003";
const viaje = prefijo + "000000000004";
const prefijoViajes = "45000000-0000-0000-1100-";
const asistencia = `/alumnos/${alumno}?vista=asistencia`;

function limpiar() {
  sql(`BEGIN;
    DELETE FROM buscontrol.admin_audit_log WHERE action = 'csv_export'
      AND (entity_id IN ('${alumno}', '${viaje}') OR details->'filtros'->>'bus' = '${bus}');
    DELETE FROM buscontrol.student_trip_status WHERE trip_id = '${viaje}' OR trip_id::text LIKE '${prefijoViajes}%';
    DELETE FROM buscontrol.bus_trips WHERE id = '${viaje}' OR id::text LIKE '${prefijoViajes}%';
    DELETE FROM buscontrol.bus_units WHERE id = '${bus}';
    DELETE FROM buscontrol.bus_beneficiaries WHERE student_id = '${alumno}';
    DELETE FROM public.social_bus_escolar WHERE id IN ('${alumno}', '${otro}');
    COMMIT;`);
}

async function descargar(page: Page) {
  const evento = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar CSV" }).click();
  const archivo = await evento;
  const path = await archivo.path();
  const bytes = await readFile(path);
  expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
  return { nombre: archivo.suggestedFilename(), csv: bytes.toString("utf8"), path };
}

test.beforeAll(() => {
  limpiar();
  sql(`BEGIN;
    INSERT INTO public.social_bus_escolar (id, nombre_alumno, dni_alumno, codigo, direccion)
    VALUES ('${alumno}', 'María; "Prueba"', '10000451', 'BU0451', 'Dirección que no se exporta'),
           ('${otro}', 'OTRO ALUMNO E2E CSV', '10000452', 'BU0452', NULL);
    INSERT INTO buscontrol.bus_beneficiaries
      (student_id, is_active, enrolled_by, deactivated_at, deactivated_by, deactivated_reason)
      SELECT '${alumno}', false, id, now(), id, 'Baja de prueba'
      FROM auth.users WHERE email = 'e2e-admin@buscontrol.local';
    INSERT INTO buscontrol.bus_units (id, code, label, is_active) VALUES ('${bus}', 'BUS-E2E-CSV', 'Bus E2E CSV', false);
    INSERT INTO buscontrol.bus_trips (id, trip_date, bus_id, turn_type, direction, status)
      SELECT ('${prefijoViajes}' || lpad(n::text,12,'0'))::uuid,
             (now() AT TIME ZONE 'America/Lima')::date, '${bus}', 'mañana', 'recojo', 'completed' FROM generate_series(1, 23) n;
    INSERT INTO buscontrol.bus_trips (id, trip_date, bus_id, turn_type, direction, status)
      VALUES ('${viaje}', (now() AT TIME ZONE 'America/Lima')::date - 1, '${bus}', 'tarde_unica', 'retorno', 'completed');
    ALTER TABLE buscontrol.bus_attendance_records DISABLE TRIGGER "attendance-push";
    INSERT INTO buscontrol.bus_attendance_records (trip_id, student_id, event_type, scanned_at, voided_at, void_reason)
      SELECT '${viaje}', '${alumno}', 'bajo', now() - (n || ' minutes')::interval, now(),
             CASE WHEN n = 1 THEN ' ' || chr(9) || '=1+1; "texto"' || chr(10) || 'Línea 2' ELSE 'Evento anulado ' || n END
      FROM generate_series(1, 22) n;
    INSERT INTO buscontrol.bus_attendance_records (trip_id, student_id, event_type, scanned_at, scanned_by)
      VALUES ('${viaje}', '${alumno}', 'manual', now(), 'b0000000-0000-0000-0000-000000000002'),
             ('${viaje}', '${otro}', 'ausente', now(), NULL);
    ALTER TABLE buscontrol.bus_attendance_records ENABLE TRIGGER "attendance-push";
    COMMIT;`);
});

test.beforeEach(async ({ page }) => loginComoAdmin(page));
test.afterAll(limpiar);

test("exporta todo el listado con los filtros aplicados y registra la preparación", async ({ page }) => {
  await page.goto(`/viajes?bus=${bus}&turno=ma%C3%B1ana&estado=completed&page=2`);
  await expect(page.getByText("Página 2 de 2 · 23 viajes")).toBeVisible();
  await page.getByLabel("Turno").selectOption("tarde_unica");
  const url = page.url();
  const archivo = await descargar(page);
  expect(archivo.nombre).toMatch(/^viajes-\d{4}-\d{2}-\d{2}\.csv$/);
  expect(archivo.csv.trimEnd().split("\r\n")).toHaveLength(24);
  expect(archivo.csv).toContain('"Recojo mañana"');
  expect(archivo.csv).not.toContain('"Tarde única"');
  await expect(page).toHaveURL(url);
  await expect(page.getByLabel("Turno")).toHaveValue("tarde_unica");
  await page.getByRole("button", { name: "Filtrar" }).click();
  const aplicada = await descargar(page);
  expect(aplicada.csv.trimEnd().split("\r\n")).toHaveLength(2);
  expect(aplicada.csv).toContain('"Tarde única"');
  await page.goto("/auditoria");
  await expect(page.getByRole("row").filter({ hasText: "Preparó una exportación CSV" }).filter({ hasText: "23 filas" })).toBeVisible();
});

test("exporta todos los eventos de un viaje, incluyendo los anulados", async ({ page }, testInfo) => {
  await page.goto(`/viajes/${viaje}?eventos=2`);
  const url = page.url();
  const archivo = await descargar(page);
  expect(archivo.nombre).toMatch(/^asistencia-viaje-.*\.csv$/);
  expect(archivo.csv.trimEnd().split("\r\n")).toHaveLength(25);
  expect(archivo.csv).toContain('"María; ""Prueba"""');
  expect(archivo.csv).toContain('"Chofer Prueba"');
  expect(archivo.csv).toContain('"Anulado";"Evento anulado 22"');
  expect(archivo.csv).toContain(`"' \t=1+1; ""texto""\nLínea 2"`);
  expect(archivo.csv).not.toContain("10000451");
  expect(archivo.csv).not.toContain("Dirección que no se exporta");
  await expect(page).toHaveURL(url);
  await copyFile(archivo.path, testInfo.outputPath("compatibilidad.csv"));
});

test("exporta la asistencia filtrada de un alumno de baja", async ({ page }) => {
  await page.goto(`${asistencia}&evento=bajo&page=2`);
  await expect(page.getByText(/Dado de baja el/)).toBeVisible();
  const url = page.url();
  const archivo = await descargar(page);
  expect(archivo.nombre).toMatch(/^asistencia-alumno-.*\.csv$/);
  expect(archivo.csv.trimEnd().split("\r\n")).toHaveLength(23);
  expect(archivo.csv).not.toContain("OTRO ALUMNO E2E CSV");
  expect(archivo.csv).not.toContain("Subida manual");
  expect(archivo.csv).not.toContain('"Operador"');
  await expect(page).toHaveURL(url);
});

test("avisa sobre consultas vacías, errores, exceso de filas y sesión vencida", async ({ page }) => {
  const boton = page.getByRole("button", { name: "Descargar CSV" });
  const aviso = page.locator(".ad-exportar").getByRole("alert");
  await page.goto(`${asistencia}&evento=ausente`);
  await boton.click();
  await expect(aviso).toHaveText("No hay registros para descargar con esta consulta.");
  await page.goto(`${asistencia}&desde=2034-06-02&hasta=2034-06-01`);
  await expect(boton).toBeDisabled();
  await page.goto(`${asistencia}&evento=manual`);
  const url = page.url();

  const destino = "**/asistencia/exportar?*";
  await page.route(destino, (route) => route.fulfill({
    status: 422, json: { error: "El CSV supera las 10.000 filas. Acota la consulta antes de descargar." },
  }), { times: 1 });
  await boton.click();
  await expect(aviso).toContainText("10.000 filas");
  await page.route(destino, (route) => route.abort("failed"), { times: 1 });
  await boton.click();
  await expect(aviso).toHaveText("No se pudo preparar el CSV. Vuelve a intentarlo.");
  expect((await descargar(page)).csv).toContain("Subida manual");
  await page.context().clearCookies();
  await boton.click();
  await expect(aviso).toHaveText("Vuelve a iniciar sesión para descargar el CSV.");
  await expect(page).toHaveURL(url);
});

test("explica el límite de tamaño en el detalle de un viaje sin filtros", async ({ page }) => {
  await page.goto(`/viajes/${viaje}`);
  await expect(page.getByRole("heading", { name: "Registros de asistencia" })).toBeVisible();
  sql(`UPDATE buscontrol.bus_attendance_records SET void_reason = repeat('x', 2200000)
       WHERE trip_id = '${viaje}' AND void_reason = 'Evento anulado 22'`);
  try {
    await page.getByRole("button", { name: "Descargar CSV" }).click();
    await expect(page.locator(".ad-exportar").getByRole("alert")).toHaveText("Este viaje supera el tamaño máximo del archivo CSV.");
  } finally {
    sql(`UPDATE buscontrol.bus_attendance_records SET void_reason = 'Evento anulado 22'
         WHERE trip_id = '${viaje}' AND octet_length(void_reason) = 2200000`);
  }
});

test("cancela una solicitud pendiente y permite reintentar en móvil", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(`/viajes/${viaje}`);
  const url = page.url();
  const boton = page.getByRole("button", { name: "Descargar CSV" });
  await boton.scrollIntoViewIfNeeded();
  await boton.focus();
  const encima = await boton.evaluate((el) =>
    el.getBoundingClientRect().bottom <= document.querySelector(".ad-bar")!.getBoundingClientRect().top);
  expect(encima).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.screenshot({ path: testInfo.outputPath("movil-320.png") });
  const destino = "**/viajes/*/exportar";
  let completar!: () => void;
  const pausa = new Promise<void>((resolve) => { completar = resolve; });
  await page.route(destino, async (route) => {
    await pausa;
    await route.abort().catch(() => {});
  }, { times: 1 });
  try {
    const peticion = page.waitForRequest((request) => request.url().endsWith("/exportar"));
    await page.keyboard.press("Enter");
    await peticion;
    await expect(page.getByRole("button", { name: "Preparando CSV…" })).toBeDisabled();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(boton).toBeFocused();
    await expect(page).toHaveURL(url);
  } finally {
    completar();
  }
  expect((await descargar(page)).csv).toContain("Evento anulado 22");
  for (const width of [360, 640, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(boton).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  }
  await page.screenshot({ path: testInfo.outputPath("escritorio-1280.png") });
});
