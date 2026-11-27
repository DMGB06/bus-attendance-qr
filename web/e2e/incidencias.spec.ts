import { expect, test } from "@playwright/test";
import { loginComoAdmin } from "./helpers/login";
import { sql } from "./helpers/db";

const prefijo = "46000000-0000-0000-1000-";
const bus = prefijo + "000000000001";
const alumno = prefijo + "000000000002";
const otro = prefijo + "000000000003";
const prefijoViaje = "46000000-0000-0000-1100-";
const viaje = prefijoViaje + "000000000001";
const nombreLargo = "APELLIDOLARGO".repeat(12);
const motivoLargo = "CONFIRMACIONDEREGISTRO".repeat(12);

function limpiar() {
  sql(`BEGIN;
    DELETE FROM buscontrol.student_trip_status WHERE trip_id::text LIKE '${prefijoViaje}%';
    DELETE FROM buscontrol.bus_trips WHERE id::text LIKE '${prefijoViaje}%';
    DELETE FROM buscontrol.bus_units WHERE id = '${bus}';
    DELETE FROM buscontrol.bus_beneficiaries WHERE student_id = '${alumno}';
    DELETE FROM public.social_bus_escolar WHERE id IN ('${alumno}', '${otro}');
    COMMIT;`);
}

test.describe("Incidencias", () => {
  test.beforeAll(() => {
    limpiar();
    sql(`BEGIN;
      INSERT INTO public.social_bus_escolar (id, nombre_alumno, dni_alumno, codigo) VALUES
        ('${alumno}', 'ALUMNO E2E INCIDENCIAS', '10000461', 'BU0461'),
        ('${otro}', '${nombreLargo}', '10000462', 'BU0462');
      INSERT INTO buscontrol.bus_beneficiaries
        (student_id, is_active, enrolled_by, deactivated_at, deactivated_by, deactivated_reason)
        SELECT '${alumno}', false, id, now(), id, 'Baja de prueba' FROM auth.users WHERE email = 'e2e-admin@buscontrol.local';
      INSERT INTO buscontrol.bus_units (id, code, label, is_active)
        VALUES ('${bus}', 'E2E-INCIDENCIAS', 'Bus de prueba', false);
      INSERT INTO buscontrol.bus_trips (id, bus_id, trip_date, turn_type, direction, status)
        SELECT ('${prefijoViaje}' || lpad(n::text,12,'0'))::uuid, '${bus}',
          (now() AT TIME ZONE 'America/Lima')::date - 1, 'mañana', 'recojo', 'completed'
        FROM generate_series(1, 23) n;
      ALTER TABLE buscontrol.bus_attendance_records DISABLE TRIGGER "attendance-push";
      INSERT INTO buscontrol.bus_attendance_records (trip_id, student_id, event_type, scanned_at, operator_id)
        SELECT id, '${alumno}', 'ausente', (trip_date + time '07:00') AT TIME ZONE 'America/Lima',
          'b0000000-0000-0000-0000-000000000002'
        FROM buscontrol.bus_trips WHERE id::text LIKE '${prefijoViaje}%';
      INSERT INTO buscontrol.bus_attendance_records (trip_id, student_id, event_type, scanned_at, scanned_by, voided_at, voided_by, void_reason)
        SELECT id, '${otro}', 'ausente', (trip_date + time '07:00') AT TIME ZONE 'America/Lima',
          'b0000000-0000-0000-0000-000000000002', (trip_date + interval '1 day 2 minutes') AT TIME ZONE 'America/Lima',
          'b0000000-0000-0000-0000-000000000001', '${motivoLargo}'
        FROM buscontrol.bus_trips WHERE id = '${viaje}';
      ALTER TABLE buscontrol.bus_attendance_records ENABLE TRIGGER "attendance-push";
      COMMIT;`);
  });

  test.beforeEach(async ({ page }) => loginComoAdmin(page));
  test.afterAll(limpiar);

  test("filtra, pagina y vuelve desde Viajes y Asistencia con el contexto conservado", async ({ page }) => {
    await page.getByRole("link", { name: "Incidencias", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Incidencias", exact: true })).toBeVisible();
    const ayer = sql(`SELECT trip_date FROM buscontrol.bus_trips WHERE id = '${viaje}'`).trim();
    await page.getByLabel("Desde").fill(ayer);
    await page.getByLabel("Hasta").fill(ayer);
    await page.getByLabel("Bus", { exact: true }).selectOption(bus);
    await page.getByLabel("Turno").selectOption("mañana");
    await page.getByLabel("Tipo de incidencia").selectOption("ausencia");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(page.getByText("Página 1 de 2 · 23 incidencias")).toBeVisible();
    await page.getByRole("link", { name: "Siguiente" }).click();
    await expect(page.getByText("Página 2 de 2 · 23 incidencias")).toBeVisible();
    const contexto = page.url();
    const tabla = page.getByRole("table");
    const enlace = tabla.getByRole("link", { name: /Ver viaje/ }).first();
    const destino = (await enlace.getAttribute("href"))!;
    await enlace.click();
    await expect(page).toHaveURL(destino);
    await expect(page.getByRole("heading", { name: "Registros de asistencia" })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(contexto);
    await tabla.getByRole("link", { name: "ALUMNO E2E INCIDENCIAS" }).first().click();
    await expect(page).toHaveURL(`/alumnos/${alumno}?vista=asistencia&desde=${ayer}&hasta=${ayer}`);
    await expect(page.getByText(/Dado de baja el/)).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(contexto);
    await expect(page.getByLabel("Bus", { exact: true })).toHaveValue(bus);
    await expect(page.getByLabel("Turno")).toHaveValue("mañana");
    await expect(page.getByLabel("Tipo de incidencia")).toHaveValue("ausencia");
    await expect(page.getByText("Página 2 de 2 · 23 incidencias")).toBeVisible();
    await page.getByRole("link", { name: "Quitar filtros" }).click();
    await expect(page).toHaveURL("/incidencias");
    await expect(page.getByText("Página 1 de 2 · 24 incidencias")).toBeVisible();
  });

  test("ofrece la última página válida y conserva los filtros al mostrar errores", async ({ page }) => {
    const filtro = `bus=${bus}&tipo=ausencia`;
    await page.goto(`/incidencias?${filtro}&page=99`);
    await expect(page.getByText("Esta página está fuera del rango.")).toBeVisible();
    await page.getByRole("link", { name: "Ir a la última página" }).click();
    await expect(page.getByText("Página 2 de 2 · 23 incidencias")).toBeVisible();
    await page.goto(`/incidencias?${filtro}&desde=2000-01-01&hasta=2000-01-02`);
    await expect(page.getByText("No hay incidencias con esos filtros.")).toBeVisible();
    await page.goto(`/incidencias?${filtro}&desde=2036-05-02&hasta=2036-05-01`);
    const aviso = page.getByRole("main").getByRole("alert");
    await expect(aviso).toHaveText("La fecha inicial no puede ser posterior a la final.");
    await page.goto(`/incidencias?${filtro}&desde=2036-02-30`);
    await expect(aviso).toHaveText("Ingresa fechas válidas.");
    await expect(page.getByLabel("Desde")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Desde")).toHaveAccessibleDescription("Ingresa fechas válidas.");
    await expect(page.getByLabel("Bus", { exact: true })).toHaveValue(bus);
    await expect(page.getByLabel("Tipo de incidencia")).toHaveValue("ausencia");
  });

  test("muestra una ausencia anulada una sola vez y ajusta los textos y el foco en móvil", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.getByRole("button", { name: "Abrir menú completo" }).click();
    await page.getByRole("navigation", { name: "Menú completo" }).getByRole("link", { name: "Incidencias" }).click();
    await expect(page).toHaveURL("/incidencias");
    await page.goto(`/incidencias?bus=${bus}&tipo=anulacion`);
    const tipo = page.getByLabel("Tipo de incidencia");
    await page.getByLabel("Turno").focus();
    await tipo.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().bottom - window.innerHeight + 2));
    await page.keyboard.press("Tab");
    await expect(tipo).toBeFocused();
    expect(await tipo.evaluate((el) => el.getBoundingClientRect().bottom <= document.querySelector(".ad-bar")!.getBoundingClientRect().top)).toBe(true);

    for (const width of [320, 360, 640, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const resultados = width === 1280 ? page.getByRole("table") : page.getByRole("list", { name: "Registros de incidencias" });
      await expect(resultados.getByText("Evento anulado", { exact: true })).toBeVisible();
      await expect(resultados.getByText("Anuló Admin Prueba")).toBeVisible();
      await expect(resultados.getByText(`Ausente · ${motivoLargo}`)).toBeVisible();
      await expect(resultados.getByText(/\d{2}\/\d{2}\/\d{4}.*00:02/)).toBeVisible();
      await expect(resultados.getByRole("link", { name: nombreLargo })).toBeVisible();
      await expect(page.getByText("Página 1 de 1 · 1 incidencia")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      if (width === 1280) {
        const celdaViaje = resultados.getByRole("row").nth(1).getByRole("cell").nth(3);
        expect(await celdaViaje.evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(144);
        await page.screenshot({ path: testInfo.outputPath("incidencias-1280.png") });
      }
    }
    await page.setViewportSize({ width: 320, height: 1600 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath("incidencias-320.png") });
  });
});

test("protege el acceso directo al módulo fuera de sesión", async ({ page }) => {
  await page.goto("/incidencias?tipo=anulacion");
  await expect(page).toHaveURL(/\/login\?next=/);
});
