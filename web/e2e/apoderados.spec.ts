// Requiere `supabase functions serve guardian-account` (las pruebas de cuentas llaman a la Edge Function).
import { expect, test, type Page } from "@playwright/test";
import { loginComoAdmin } from "./helpers/login";
import { G1, G2, limpiarApoderados, resetApoderados, S1, S2, sql } from "./helpers/db";

test.beforeEach(async ({ page }) => {
  resetApoderados();
  await loginComoAdmin(page);
});
test.afterAll(() => limpiarApoderados());

const fila = (page: Page, nombre: string) => page.getByRole("row").filter({ hasText: nombre });
const correo = () => `e2e-padre-${Date.now()}@buscontrol.local`;
const authUsers = (email: string) => sql(`SELECT count(*) FROM auth.users WHERE email = '${email}'`).trim();

test("la lista muestra alumnos, cuenta y estado, y filtra y busca", async ({ page }) => {
  await page.goto("/apoderados");
  const rosa = fila(page, "Rosa Prueba");
  await expect(rosa).toContainText("ALUMNO PRUEBA UNO");
  await expect(rosa).toContainText("Sin cuenta");
  await expect(rosa).toContainText("Activo");
  await expect(fila(page, "Julio Prueba")).toContainText("Sin alumnos");

  await page.getByLabel("Buscar apoderado").fill("+51 987-654");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/q=/);
  await expect(fila(page, "Rosa Prueba")).toBeVisible();
  await expect(fila(page, "Julio Prueba")).toHaveCount(0);

  await page.goto("/apoderados");
  await page.getByRole("link", { name: "Desactivados" }).click();
  await expect(page.getByText("No hay apoderados con esa búsqueda o filtro.")).toBeVisible();
});

test("crear apoderado lleva a su ficha; el teléfono repetido se rechaza", async ({ page }) => {
  await page.goto("/apoderados");
  await page.getByRole("button", { name: "Nuevo apoderado" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByRole("button", { name: "Guardar" }).click(); // el navegador exige el nombre
  await expect(dlg.getByLabel(/Nombre completo/)).toBeFocused();

  await dlg.getByLabel(/Nombre completo/).fill("Otra Persona E2E");
  await dlg.getByLabel("Teléfono").fill("987654321"); // ya es de Rosa
  await dlg.getByRole("button", { name: "Guardar" }).click();
  await expect(dlg.getByRole("alert")).toHaveText("Ya existe un apoderado con ese teléfono.");

  await expect(dlg.getByLabel(/Nombre completo/)).toHaveValue("Otra Persona E2E"); // el error no borra lo escrito
  await dlg.getByLabel("Teléfono").fill("955000111");
  await dlg.getByRole("button", { name: "Guardar" }).click();
  await expect(page).toHaveURL(/\/apoderados\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Otra Persona E2E", level: 2 })).toBeVisible();
});

test("editar datos cambia la ficha y valida el formato", async ({ page }) => {
  await page.goto(`/apoderados/${G1}`);
  await page.getByRole("button", { name: "Editar datos" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("DNI").fill("123");
  await dlg.getByRole("button", { name: "Guardar" }).click();
  await expect(dlg.getByRole("alert")).toContainText("DNI inválido");
  await dlg.getByLabel("DNI").fill("44123119");
  await dlg.getByLabel(/Nombre completo/).fill("Rosa Prueba Editada");
  await dlg.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Rosa Prueba Editada", level: 2 })).toBeVisible();
});

test("vincular alumno, marcar principal y desvincular", async ({ page }) => {
  await page.goto(`/apoderados/${G2}`);
  await expect(page.getByText("Este apoderado no tiene alumnos vinculados.")).toBeVisible();

  await page.getByRole("button", { name: "Vincular alumno" }).click();
  const dlg = page.getByRole("dialog");
  await expect(dlg.getByRole("button", { name: "Vincular" })).toBeDisabled(); // sin alumno elegido
  await dlg.getByLabel("Buscar alumno").fill("PRUEBA UNO");
  await dlg.getByRole("option", { name: /ALUMNO PRUEBA UNO/ }).click();
  await dlg.getByLabel("Parentesco").selectOption("padre");
  await dlg.getByRole("button", { name: "Vincular" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const item = page.getByRole("listitem").filter({ hasText: "ALUMNO PRUEBA UNO" });
  await expect(item).toContainText("el principal es Rosa Prueba");
  await item.getByRole("button", { name: "Marcar como principal" }).click();
  await expect(item.getByText("Principal", { exact: true })).toBeVisible();
  expect(sql(`SELECT guardian_id FROM buscontrol.bus_student_guardians WHERE student_id = '${S1}' AND is_primary`).trim()).toBe(G2); // Rosa dejó de serlo

  await item.getByRole("button", { name: "Desvincular" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Desvincular" }).click();
  await expect(page.getByText("Este apoderado no tiene alumnos vinculados.")).toBeVisible();
  expect(sql(`SELECT count(*) FROM buscontrol.bus_student_guardians WHERE guardian_id = '${G2}'`).trim()).toBe("0");
  void S2;
});

test("crear cuenta muestra la contraseña una vez; no reaparece al recargar", async ({ page }) => {
  const email = correo();
  await page.goto(`/apoderados/${G2}`);
  await expect(page.getByRole("button", { name: "Crear cuenta" })).toBeDisabled(); // sin correo
  await expect(page.getByText(/Primero agrega un correo/)).toBeVisible();

  await page.getByRole("button", { name: "Editar datos" }).click();
  await page.getByRole("dialog").getByLabel("Correo").fill(email);
  await page.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("button", { name: "Crear cuenta" }).click();
  const dlg = page.getByRole("alertdialog").or(page.getByRole("dialog"));
  const clave = await dlg.getByTestId("clave-temporal").textContent();
  expect(clave).toMatch(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/);
  await expect(dlg).toContainText(email);
  await expect(dlg).toContainText("se muestra una sola vez");
  await dlg.getByRole("button", { name: "Ya anoté la contraseña" }).click();

  await expect(page.getByText("Con cuenta", { exact: true })).toBeVisible();
  await page.reload();
  expect(await page.content()).not.toContain(clave!); // Review Focus 5
  expect(sql(`SELECT app_role FROM buscontrol.app_profiles WHERE email = '${email}'`).trim()).toBe("padre");

  await page.getByRole("button", { name: "Reiniciar contraseña" }).click();
  const nueva = await page.getByTestId("clave-temporal").textContent();
  expect(nueva).not.toBe(clave);
});

test("correo ya registrado en Auth: mensaje genérico y no se crea nada", async ({ page }) => {
  sql(`UPDATE buscontrol.bus_guardians SET email = 'padre@test.local' WHERE id = '${G2}'`);
  await page.goto(`/apoderados/${G2}`);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.locator("p.ad-error")).toHaveText("No se pudo crear la cuenta con ese correo."); // Review Focus 4
  expect(authUsers("padre@test.local")).toBe("1");
  expect(sql(`SELECT auth_user_id IS NULL FROM buscontrol.bus_guardians WHERE id = '${G2}'`).trim()).toBe("t");
});

test("desactivar bloquea la cuenta y reactivar la devuelve", async ({ page }) => {
  const email = correo();
  sql(`UPDATE buscontrol.bus_guardians SET email = '${email}' WHERE id = '${G2}'`);
  await page.goto(`/apoderados/${G2}`);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.getByRole("button", { name: "Ya anoté la contraseña" }).click();

  await page.getByRole("button", { name: "Desactivar", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Desactivar" }).click();
  await expect(page.getByText("Desactivado", { exact: true })).toBeVisible();
  await expect(page.getByText("Cuenta bloqueada")).toBeVisible();
  expect(sql(`SELECT is_active FROM buscontrol.bus_guardians WHERE id = '${G2}'`).trim()).toBe("f");
  expect(sql(`SELECT p.is_active, u.banned_until IS NOT NULL FROM buscontrol.app_profiles p JOIN auth.users u ON u.id = p.id WHERE p.email = '${email}'`).trim()).toBe("f|t");

  await page.getByRole("button", { name: "Reactivar" }).click();
  await expect(page.getByText("Activo", { exact: true })).toBeVisible();
  await expect(page.getByText("Con cuenta", { exact: true })).toBeVisible();
  expect(sql(`SELECT p.is_active, u.banned_until IS NULL FROM buscontrol.app_profiles p JOIN auth.users u ON u.id = p.id WHERE p.email = '${email}'`).trim()).toBe("t|t");
});

test("un id inválido o inexistente muestra la pantalla 404", async ({ page }) => {
  await page.goto("/apoderados/no-es-un-uuid");
  await expect(page.getByText("Esta página no existe")).toBeVisible();
  await page.goto("/apoderados/c1000000-0000-0000-0000-0000000000ff");
  await expect(page.getByText("Esta página no existe")).toBeVisible();
});
