import { expect, test } from "@playwright/test";
import { loginComoAdmin } from "./helpers/login";
import { sql } from "./helpers/db";

const alumno = "43000000-0000-0000-1000-000000000001";
const sinEventos = "43000000-0000-0000-1000-000000000002";
const prefijoViaje = "43000000-0000-0000-1100-";
const primerViaje = `${prefijoViaje}000000000001`;
const ultimoViaje = `${prefijoViaje}000000000023`;
const url = `/alumnos/${alumno}?vista=asistencia`;
const operador = "b0000000-0000-0000-0000-000000000002";
const motivoLargo = "REGISTRODUPLICADO".repeat(12);
const nombreLargo = "APELLIDO".repeat(18);

function limpiar() {
  sql(`BEGIN;
    DELETE FROM buscontrol.student_trip_status WHERE trip_id::text LIKE '${prefijoViaje}%';
    DELETE FROM buscontrol.bus_trips WHERE id::text LIKE '${prefijoViaje}%';
    DELETE FROM buscontrol.bus_beneficiaries WHERE student_id = '${alumno}';
    DELETE FROM public.social_bus_escolar WHERE id IN ('${alumno}', '${sinEventos}');
    COMMIT;`);
}

test.describe("Asistencia por alumno", () => {
  test.beforeAll(() => {
    limpiar();
    sql(`BEGIN;
      INSERT INTO public.social_bus_escolar (id, nombre_alumno, dni_alumno, codigo)
        VALUES ('${alumno}', 'ALUMNO E2E ASISTENCIA', '10000431', 'BU0431'),
               ('${sinEventos}', 'ALUMNO E2E SIN EVENTOS', '10000432', 'BU0432');
      INSERT INTO buscontrol.bus_beneficiaries
        (student_id, is_active, enrolled_by, deactivated_at, deactivated_by, deactivated_reason)
        SELECT '${alumno}', false, id, now(), id, 'Baja de prueba'
        FROM auth.users WHERE email = 'e2e-admin@buscontrol.local';
      INSERT INTO buscontrol.bus_trips (id, trip_date, turn_type, direction, status)
        SELECT ('${prefijoViaje}' || lpad(n::text, 12, '0'))::uuid,
               (now() AT TIME ZONE 'America/Lima')::date - 1, 'mañana', 'recojo', 'completed'
        FROM generate_series(1, 22) n;
      INSERT INTO buscontrol.bus_trips (id, trip_date, turn_type, direction, status)
        VALUES ('${ultimoViaje}', (now() AT TIME ZONE 'America/Lima')::date, 'tarde_unica', 'retorno', 'completed');
      ALTER TABLE buscontrol.bus_attendance_records DISABLE TRIGGER "attendance-push";
      INSERT INTO buscontrol.bus_attendance_records (trip_id, student_id, event_type, scanned_at, scanned_by)
        SELECT id, '${alumno}', 'manual', (trip_date + time '00:05' + interval '1 day') AT TIME ZONE 'America/Lima', '${operador}'
        FROM buscontrol.bus_trips WHERE id::text LIKE '${prefijoViaje}%' AND id <> '${ultimoViaje}';
      INSERT INTO buscontrol.bus_attendance_records (trip_id, student_id, event_type, scanned_at, scanned_by, voided_at, void_reason)
        VALUES ('${primerViaje}', '${alumno}', 'subio', now() - interval '1 day', '${operador}', NULL, NULL),
               ('${ultimoViaje}', '${alumno}', 'ausente', now(), '${operador}', NULL, NULL),
               ('${ultimoViaje}', '${alumno}', 'bajo', now(), '${operador}', now(), '${motivoLargo}');
      ALTER TABLE buscontrol.bus_attendance_records ENABLE TRIGGER "attendance-push";
      COMMIT;`);
  });

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test.afterAll(limpiar);

  test("abre la ficha desde Alumnos y conserva los filtros al paginar y volver de un viaje", async ({ page }) => {
    await page.goto("/alumnos?q=BU0431");
    await page.getByRole("button", { name: "ALUMNO E2E ASISTENCIA" }).click();
    await page.getByRole("link", { name: "Ver ficha completa" }).click();
    await expect(page.getByRole("link", { name: "Datos del alumno" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "Datos del padrón" })).toBeVisible();

    await page.getByRole("link", { name: "Asistencia", exact: true }).click();
    await expect(page).toHaveURL(url);
    await expect(page.getByRole("link", { name: "Asistencia", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText(/Dado de baja el/)).toBeVisible();
    const resumen = page.getByRole("region", { name: "Resumen de asistencia" });
    await expect(resumen.locator("dd")).toHaveText(["22", "1"]);
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(21);

    const ayer = sql(`SELECT trip_date FROM buscontrol.bus_trips WHERE id = '${primerViaje}'`).trim();
    await page.getByLabel("Desde").fill(ayer);
    await page.getByLabel("Hasta").fill(ayer);
    await page.getByLabel("Turno").selectOption("mañana");
    await page.getByLabel("Evento").selectOption("subio");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(resumen.locator("dd")).toHaveText(["22", "0"]);
    await expect(page.getByText("Página 1 de 2 · 23 registros")).toBeVisible();
    await expect(page.getByRole("table").getByText(/\d{2}\/\d{2}\/\d{4}.*00:05/).first()).toBeVisible();

    await page.getByRole("link", { name: "Siguiente" }).click();
    await expect(page.getByText("Página 2 de 2 · 23 registros")).toBeVisible();
    const filtrada = page.url();
    await page.getByRole("table").getByRole("row", { name: /Subió/ }).getByRole("link").click();
    await expect(page).toHaveURL(`/viajes/${primerViaje}`);
    await expect(page.getByRole("heading", { name: "Registros de asistencia" })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(filtrada);
    await expect(page.getByLabel("Desde")).toHaveValue(ayer);
    await expect(page.getByLabel("Hasta")).toHaveValue(ayer);
    await expect(page.getByLabel("Turno")).toHaveValue("mañana");
    await expect(page.getByLabel("Evento")).toHaveValue("subio");
    await expect(page.getByText("Página 2 de 2 · 23 registros")).toBeVisible();
    await page.getByLabel("Evento").selectOption("manual");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(page.getByText("Página 1 de 2 · 22 registros")).toBeVisible();
    await expect(resumen.locator("dd")).toHaveText(["22", "0"]);
    await page.getByRole("link", { name: "Quitar filtros" }).click();
    await expect(page).toHaveURL(url);
    await expect(resumen.locator("dd")).toHaveText(["22", "1"]);
  });

  test("distingue historial vacío, filtros sin resultados y fechas inválidas", async ({ page }) => {
    await page.goto(`/alumnos/${sinEventos}?vista=asistencia`);
    await expect(page.getByText("No hay registros de asistencia en los últimos siete días.")).toBeVisible();
    await page.goto(`${url}&turno=mañana&evento=ausente`);
    await expect(page.getByText("No hay registros de asistencia con esos filtros.")).toBeVisible();
    await expect(page.getByRole("region", { name: "Resumen de asistencia" }).locator("dd")).toHaveText(["22", "0"]);
    const alerta = page.getByRole("region", { name: "Historial de asistencia" }).getByRole("alert");
    await page.goto(`${url}&desde=2030-05-02&hasta=2030-05-01`);
    await expect(alerta).toHaveText("La fecha inicial no puede ser posterior a la final.");
    await expect(page.getByLabel("Desde")).toHaveAttribute("aria-invalid", "true");
    await page.goto(`${url}&desde=2030-02-30`);
    await expect(alerta).toHaveText("Ingresa fechas válidas.");
  });

  test("ofrece la última página válida y conserva el tipo de evento", async ({ page }) => {
    await page.goto(`${url}&evento=manual&page=99`);
    await expect(page.getByText("Esta página está fuera del rango.")).toBeVisible();
    await page.getByRole("link", { name: "Ir a la última página" }).click();
    await expect(page.getByLabel("Evento")).toHaveValue("manual");
    await expect(page.getByText("Página 2 de 2 · 22 registros")).toBeVisible();
  });

  test("el foco del filtro queda por encima de la barra inferior en móvil", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(`${url}&evento=bajo`);
    const turno = page.getByLabel("Turno");
    await page.getByLabel("Hasta").focus();
    // Deja Turno dentro de la ventana, en la zona que cubre la barra fija.
    await turno.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().bottom - window.innerHeight + 2));
    for (let i = 0; i < 4 && !(await turno.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press("Tab");
    }
    await expect(turno).toBeFocused();
    const visible = await turno.evaluate((el) =>
      el.getBoundingClientRect().bottom <= document.querySelector(".ad-bar")!.getBoundingClientRect().top);
    expect(visible).toBe(true);
  });

  test("ajusta nombres y motivos extensos y conserva el foco visible al navegar con teclado", async ({ page }, testInfo) => {
    sql(`UPDATE public.social_bus_escolar SET nombre_alumno = '${nombreLargo}' WHERE id = '${alumno}'`);
    try {
      await page.goto(`${url}&evento=bajo`);
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeFocused();
      await page.keyboard.press("Enter");
      const desde = page.getByLabel("Desde");
      for (let i = 0; i < 8 && !(await desde.evaluate((el) => el === document.activeElement)); i++) {
        await page.keyboard.press("Tab");
      }
      await expect(desde).toBeFocused();
      expect(await desde.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe("none");

      const historial = page.getByRole("region", { name: "Historial de asistencia" });
      for (const width of [1280, 640, 360, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(page.getByRole("heading", { name: nombreLargo })).toBeVisible();
        const registro = width === 1280 ? historial.getByRole("table") : historial.getByRole("list");
        await expect(registro.getByText("Anulado", { exact: true })).toBeVisible();
        await expect(registro.getByText(`Motivo de anulación: ${motivoLargo}`)).toBeVisible();
        await expect(registro.getByRole("link", { name: /Ver viaje/ })).toHaveAttribute("href", `/viajes/${ultimoViaje}`);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
        const path = testInfo.outputPath(`asistencia-${width}.png`);
        await page.screenshot({ path, fullPage: true });
        await testInfo.attach(`asistencia-${width}`, { path, contentType: "image/png" });
      }
    } finally {
      sql(`UPDATE public.social_bus_escolar SET nombre_alumno = 'ALUMNO E2E ASISTENCIA' WHERE id = '${alumno}'`);
    }
  });
});

test("protege el enlace directo de Asistencia fuera de sesión", async ({ page }) => {
  await page.goto(url);
  await expect(page).toHaveURL(/\/login\?next=.*vista%3Dasistencia/);
});
