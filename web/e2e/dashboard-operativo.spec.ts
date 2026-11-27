import { expect, test } from "@playwright/test";
import { fechaViaje, ultimosSieteDiasLima } from "../lib/schemas/viajes";
import { sql } from "./helpers/db";
import { loginComoAdmin } from "./helpers/login";

const prefijo = "48000000-0000-0000-1100-";
const bus = prefijo + "000000000001";
const alumno = prefijo + "000000000002";
const viajes = [3, 4, 5].map((n) => prefijo + String(n).padStart(12, "0"));

function limpiar() {
  sql(`BEGIN;
    DELETE FROM buscontrol.student_trip_status WHERE trip_id IN ('${viajes.join("','")}');
    DELETE FROM buscontrol.bus_trips WHERE id IN ('${viajes.join("','")}');
    DELETE FROM buscontrol.bus_units WHERE id = '${bus}';
    DELETE FROM public.social_bus_escolar WHERE id = '${alumno}';
    COMMIT;`);
}

test.describe("Dashboard operativo", () => {
  test.beforeAll(() => {
    limpiar();
    sql(`BEGIN;
      INSERT INTO public.social_bus_escolar (id, nombre_alumno, dni_alumno)
        VALUES ('${alumno}', 'Alumno E2E Dashboard', '10000481');
      INSERT INTO buscontrol.bus_units (id, code, label) VALUES ('${bus}', 'E2E-DASHBOARD', 'Bus de prueba');
      INSERT INTO buscontrol.bus_trips (id, bus_id, trip_date, turn_type, direction, status)
        SELECT id::uuid, '${bus}', (now() AT TIME ZONE 'America/Lima')::date - dias, 'mañana', 'recojo', estado
        FROM (VALUES ('${viajes[0]}', 0, 'active'), ('${viajes[1]}', 0, 'completed'),
                     ('${viajes[2]}', 6, 'completed')) v(id, dias, estado);
      ALTER TABLE buscontrol.bus_attendance_records DISABLE TRIGGER "attendance-push";
      INSERT INTO buscontrol.bus_attendance_records (trip_id, student_id, event_type, scanned_at, voided_at, void_reason)
        SELECT id::uuid, '${alumno}', tipo, now(), CASE WHEN anulado THEN now() END,
               CASE WHEN anulado THEN 'Registro de prueba' END
        FROM (VALUES ('${viajes[0]}', 'subio', false), ('${viajes[0]}', 'manual', false),
          ('${viajes[0]}', 'ausente', true), ('${viajes[1]}', 'manual', false), ('${viajes[1]}', 'ausente', false)) v(id, tipo, anulado);
      ALTER TABLE buscontrol.bus_attendance_records ENABLE TRIGGER "attendance-push";
      COMMIT;`);
  });
  test.afterAll(limpiar);

  test("muestra los conteos de hoy y abre los módulos con el corte correcto", async ({ page }) => {
    await loginComoAdmin(page);
    const { desde, hasta } = ultimosSieteDiasLima(new Date());
    const operacion = page.getByRole("region", { name: "Operación del transporte" });
    const hoy = `desde=${hasta}&hasta=${hasta}`;
    await expect(operacion.locator("time").first()).toHaveAttribute("datetime", hasta);
    await expect(operacion.getByRole("link", { name: /Subidas registradas 2/ })).toHaveAttribute("href", `/viajes?${hoy}`);
    for (const [label, estado] of [["Viajes en curso", "active"], ["Viajes cerrados", "completed"]]) {
      const tarjeta = operacion.getByRole("link", { name: new RegExp(`${label} 1`) });
      await tarjeta.click();
      await expect(page).toHaveURL(`/viajes?${hoy}&estado=${estado}`);
      await expect(page.getByRole("table").getByRole("row").filter({ hasText: "E2E-DASHBOARD" })).toHaveCount(1);
      await page.goBack();
      await expect(operacion).toBeVisible();
    }
    const incidencias = operacion.getByRole("link", { name: /Incidencias 2/ });
    await expect(incidencias).toContainText("1 ausencia · 1 anulación");
    await incidencias.click();
    await expect(page).toHaveURL(`/incidencias?${hoy}`);
    await expect(page.getByText("Página 1 de 1 · 2 incidencias")).toBeVisible();
    await page.goBack();
    await operacion.getByRole("link", { name: "Ver viajes de estos siete días" }).click();
    await expect(page).toHaveURL(`/viajes?desde=${desde}&hasta=${hasta}`);
    await expect(page.getByRole("table").getByRole("row").filter({ hasText: "E2E-DASHBOARD" })).toHaveCount(3);
  });

  test("la tabla semanal se abre por teclado y conserva el foco visible en móvil", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 750 });
    await loginComoAdmin(page);
    const { desde, hasta } = ultimosSieteDiasLima(new Date());
    const tabla = page.getByRole("table", { name: "Viajes por día" });
    const resumen = page.getByText("Ver viajes como tabla", { exact: true });
    await expect(page.getByRole("img", { name: "Viajes por día" })).toHaveAccessibleDescription(new RegExp(fechaViaje(hasta)));
    await page.getByRole("region", { name: "Operación del transporte" }).getByRole("link", { name: /Incidencias 2/ }).focus();
    await resumen.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().bottom - window.innerHeight + 3));
    await page.keyboard.press("Tab");
    await expect(resumen).toBeFocused();
    expect(await resumen.evaluate((el) => ({
      outline: getComputedStyle(el).outlineStyle,
      visible: el.getBoundingClientRect().bottom <= document.querySelector(".ad-bar")!.getBoundingClientRect().top,
    }))).toEqual({ outline: "solid", visible: true });
    await page.keyboard.press("Enter");
    await expect(tabla.getByRole("row")).toHaveCount(8);
    await expect(tabla.getByRole("row").nth(1).getByRole("cell")).toHaveText(["0", "1", "1"]);
    await expect(tabla.getByRole("row").nth(1).getByRole("rowheader")).toHaveText(fechaViaje(desde));
    await expect(tabla.getByRole("row").nth(2).getByRole("cell")).toHaveText(["0", "0", "0"]);
    await expect(tabla.getByRole("row").last().getByRole("cell")).toHaveText(["1", "1", "2"]);
    for (const width of [320, 360, 640, 1280]) {
      await page.setViewportSize({ width, height: 750 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      expect(await tabla.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await tabla.getByRole("columnheader", { name: "Cerrados" }).evaluate((el) => {
        const texto = document.createRange();
        texto.selectNodeContents(el);
        return texto.getClientRects().length;
      })).toBe(1);
    }
  });
});
