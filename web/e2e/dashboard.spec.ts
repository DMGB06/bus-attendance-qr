import { expect, test } from "@playwright/test";
import { loginComoAdmin } from "./helpers/login";
import { limpiarCarnets, resetCarnets, S2, S3, S4, S5, sql } from "./helpers/db";

test.afterAll(() => limpiarCarnets());

const ROSA = "c1000000-0000-0000-0000-000000000001";

test.describe("dashboard", () => {
  test.beforeEach(async ({ page }) => {
    resetCarnets();
    await loginComoAdmin(page);
  });

  // Datos conocidos: 5 beneficiarios activos. S1 vigente, S2 vencido, S4 perdido, S3 y S5 sin carnet.
  // Rosa (activa) solo tiene a S1. Los carnets de S1 y S4 se emitieron hoy.
  test("los números coinciden con la base", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Alumnos activos 5/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Carnets vigentes 1 de 5/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Apoderados activos 1/ })).toContainText("0 con cuenta para la app");
    await expect(page.getByRole("link", { name: /Emitidos este mes 2/ })).toBeVisible();

    await expect(page.getByRole("img", { name: "Estado de los carnets: 1 vigentes, 1 vencidos, 1 perdidos, 2 sin carnet" })).toBeVisible();
    await expect(page.getByRole("img", { name: "1 alumnos con apoderado y 4 sin apoderado" })).toBeVisible();
    await expect(page.getByRole("img", { name: /^Carnets emitidos por mes: .*, \w{3} 2$/ })).toBeVisible();

    await expect(page.getByRole("link", { name: /4 Alumnos sin apoderado/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /4 Sin carnet vigente/ })).toContainText("1 vencidos, 1 perdidos, 2 sin carnet");
  });

  test("la gráfica de meses tiene vista en tabla con seis meses", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Ver como tabla").click();
    const filas = page.getByRole("table", { name: "Carnets emitidos por mes" }).getByRole("row");
    await expect(filas).toHaveCount(7); // encabezado + 6 meses
    await expect(filas.last()).toContainText("2"); // el mes actual
  });

  test("las alertas y las tarjetas llevan a su módulo", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /4 Sin carnet vigente/ }).click();
    await expect(page).toHaveURL(/\/qr\?filtro=por_emitir/);
    await expect(page.getByRole("row").filter({ hasText: "ALUMNO PRUEBA UNO" })).toHaveCount(0); // S1 vigente no está por emitir
    await page.goto("/");
    await page.getByRole("link", { name: /Apoderados activos/ }).click();
    await expect(page).toHaveURL(/\/apoderados/);
  });

  test("sin pendientes las alertas se vuelven avisos verdes", async ({ page }) => {
    sql(`
      INSERT INTO buscontrol.bus_student_guardians (student_id, guardian_id, is_primary)
        SELECT x, '${ROSA}', false FROM unnest(ARRAY['${S2}','${S3}','${S4}','${S5}']::uuid[]) x;
      UPDATE buscontrol.qr_codes SET issued_at = now() WHERE student_id = '${S2}';
      UPDATE buscontrol.qr_codes SET status = 'vigente', closed_at = NULL, reason = NULL WHERE student_id = '${S4}';
      INSERT INTO buscontrol.qr_codes (student_id, code, issued_by)
        SELECT x, 'BU90' || right(x::text, 2), (SELECT id FROM auth.users WHERE email = 'e2e-admin@buscontrol.local') FROM unnest(ARRAY['${S3}','${S5}']::uuid[]) x;
    `);
    await page.goto("/");
    await expect(page.getByText("Todos los alumnos tienen apoderado")).toBeVisible();
    await expect(page.getByText("Todos tienen carnet vigente este año")).toBeVisible();
    await expect(page.getByRole("link", { name: /Carnets vigentes 5 de 5/ })).toBeVisible();
    expect(sql(`SELECT count(*) FROM buscontrol.qr_codes WHERE status = 'vigente'`).trim()).toBe("5");
  });
});
