import { expect, test, type Page } from "@playwright/test";
import { loginComoAdmin } from "./helpers/login";
import { limpiarAlumnos, resetAlumnos, S1, G1, sql } from "./helpers/db";

const ADMIN = "e2e-admin@buscontrol.local";
const fila = (page: Page, texto: string) => page.getByRole("row").filter({ hasText: texto });

test.afterAll(() => {
  sql(`DELETE FROM buscontrol.admin_audit_log WHERE action <> 'session_login' AND action <> 'session_logout'`);
  limpiarAlumnos();
});

// Un movimiento de cada tipo, con S1 (ALUMNO PRUEBA UNO) y G1 (Rosa Prueba) existentes.
function sembrar() {
  resetAlumnos();
  sql(`
    DELETE FROM buscontrol.admin_audit_log;
    INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, entity_id, details, created_at)
    SELECT u.id, x.action, x.entity, x.entity_id::uuid, x.details::jsonb, now() - x.hace::interval
    FROM auth.users u, (VALUES
      ('qr_print','qr_codes',NULL,'{"format":"pdf","count":3}','1 minute'),
      ('qr_issue','qr_codes','${S1}','{"student_id":"${S1}","code":"BU0098"}','2 minutes'),
      ('qr_report_lost','qr_codes','${S1}','{"student_id":"${S1}","code":"BU0098","reason":"Se le cayo en el bus"}','3 minutes'),
      ('guardian_account_reset_password','bus_guardians','${G1}','{}','4 minutes'),
      ('guardian_link','bus_student_guardians','${G1}','{"student_id":"${S1}","is_primary":true}','5 minutes'),
      ('beneficiary_deactivate','bus_beneficiaries','${S1}','{"student_id":"${S1}","reason":"Se mudo de distrito"}','6 minutes'),
      ('session_login','auth_session',NULL,'{"ip":"9.9.9.9","user_agent":"secreto"}','45 days')
    ) AS x(action, entity, entity_id, details, hace)
    WHERE u.email = '${ADMIN}';
  `);
}

test.describe("auditoría", () => {
  test.beforeEach(async ({ page }) => {
    sembrar();
    await loginComoAdmin(page);
  });

  test("cada movimiento dice qué se hizo, sobre quién, el detalle y quién lo hizo", async ({ page }) => {
    await page.goto("/auditoria");
    await expect(page.getByText("Las contraseñas nunca se guardan.")).toBeVisible();

    await expect(fila(page, "Imprimió carnets")).toContainText("3 alumnos");
    await expect(fila(page, "Imprimió carnets")).toContainText("Hoja A4 en PDF");
    await expect(fila(page, "Emitió un carnet")).toContainText("Código BU0098");
    await expect(fila(page, "Reportó un carnet perdido")).toContainText('"Se le cayo en el bus"');
    await expect(fila(page, "Restableció la contraseña")).toContainText("Rosa Prueba");
    await expect(fila(page, "Restableció la contraseña")).toContainText("La contraseña nueva no se guarda");
    await expect(fila(page, "Vinculó un alumno")).toContainText("ALUMNO PRUEBA UNO, como principal");
    const baja = fila(page, "Dio de baja a un alumno");
    await expect(baja).toContainText("ALUMNO PRUEBA UNO");
    await expect(baja).toContainText('"Se mudo de distrito"');
    await expect(baja).toContainText(ADMIN); // quién
    await expect(baja).toContainText(/\d{2}\/\d{2}\/\d{4}/); // cuándo
    await expect(page.getByRole("row", { name: /Imprimió carnets/ }).locator("..")).not.toContainText("9.9.9.9");
  });

  test("por defecto muestra los últimos 30 días; ampliar las fechas trae lo antiguo", async ({ page }) => {
    await page.goto("/auditoria");
    await expect(fila(page, "Inició sesión")).toHaveCount(1); // solo el inicio de sesión de esta prueba; el de hace 45 días no
    await page.getByLabel("Desde").fill("2000-01-01");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(fila(page, "Inició sesión")).toHaveCount(2);
    await expect(page.locator("body")).not.toContainText("9.9.9.9");
    await expect(page.locator("body")).not.toContainText("secreto");
  });

  test("filtrar por tipo", async ({ page }) => {
    await page.goto("/auditoria");
    const tipos = page.getByRole("navigation", { name: "Tipo de movimiento" });
    await tipos.getByRole("link", { name: "Carnets", exact: true }).click();
    await expect(page).toHaveURL(/grupo=carnets/);
    await expect(fila(page, "Emitió un carnet")).toBeVisible();
    await expect(fila(page, "Dio de baja a un alumno")).toHaveCount(0);
    await tipos.getByRole("link", { name: "Alumnos", exact: true }).click();
    await expect(fila(page, "Dio de baja a un alumno")).toBeVisible();
    await expect(fila(page, "Emitió un carnet")).toHaveCount(0);
  });

  test("sin resultados muestra el aviso y se puede quitar el filtro", async ({ page }) => {
    await page.goto("/auditoria?desde=2020-01-01&hasta=2020-01-02");
    await expect(page.getByText("No hay movimientos con esos filtros.")).toBeVisible();
    await page.getByRole("link", { name: "Quitar filtros" }).first().click();
    await expect(fila(page, "Imprimió carnets")).toBeVisible();
  });

  test("fecha inicial posterior a la final avisa y no rompe", async ({ page }) => {
    await page.goto("/auditoria?desde=2026-11-09&hasta=2026-11-01");
    await expect(page.getByRole("alert").filter({ hasText: "fecha inicial" })).toBeVisible();
  });

  test("una acción hecha en el panel aparece enseguida en la auditoría", async ({ page }) => {
    await page.goto(`/alumnos/${S1}`);
    await page.getByRole("button", { name: "Reactivar" }).isVisible().catch(() => false);
    await page.getByRole("button", { name: "Dar de baja" }).click();
    const dlg = page.getByRole("dialog");
    await dlg.getByLabel(/Motivo de la baja/).fill("Prueba de auditoría E2E");
    await dlg.getByRole("button", { name: "Dar de baja" }).click();
    await expect(page.getByText(/Dado de baja el/)).toBeVisible();

    await page.goto("/auditoria");
    await expect(fila(page, "Prueba de auditoría E2E")).toContainText("Dio de baja a un alumno");
  });

  test("más de 20 movimientos se paginan", async ({ page }) => {
    sql(`
      INSERT INTO buscontrol.admin_audit_log (actor_id, action, entity, entity_id, details)
      SELECT u.id, 'qr_print', 'qr_codes', NULL, '{"format":"png","count":1}'::jsonb FROM auth.users u, generate_series(1, 20) WHERE u.email = '${ADMIN}';
    `);
    await page.goto("/auditoria");
    await expect(page.getByText(/Página 1 de 2 · 27 movimientos/)).toBeVisible();
    await page.getByRole("link", { name: "Siguiente" }).click();
    await expect(page.getByText(/Página 2 de 2/)).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "Dio de baja a un alumno" })).toBeVisible(); // lo más antiguo de la ventana
  });
});
