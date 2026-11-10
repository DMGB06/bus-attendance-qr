import { expect, test } from "@playwright/test";
import { loginComoAdmin } from "./helpers/login";
import { limpiarAlumnos, resetAlumnos, S1, S3 } from "./helpers/db";

test.beforeEach(async ({ page }) => {
  resetAlumnos();
  await loginComoAdmin(page);
});
test.afterAll(() => limpiarAlumnos());

const fila = (page: import("@playwright/test").Page, nombre: string) => page.getByRole("row").filter({ hasText: nombre });

test("la lista muestra estado, apoderado y carnet de cada alumno", async ({ page }) => {
  await page.goto("/alumnos");
  const uno = fila(page, "ALUMNO PRUEBA UNO");
  await expect(uno).toContainText("BU0098");
  await expect(uno).toContainText("Beneficiario");
  await expect(uno).toContainText("Rosa Prueba");
  await expect(uno).toContainText(`Vigente ${new Date().getFullYear()}`);
  const tres = fila(page, "ALUMNO PRUEBA TRES");
  await expect(tres).toContainText("Sin código"); // Review Focus 1: no se rompe sin código
  await expect(tres).toContainText("Sin alta");
});

test("buscar por código y filtrar por estado", async ({ page }) => {
  await page.goto("/alumnos");
  await page.getByLabel("Buscar alumno").fill("bu0098");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/q=bu0098/);
  await expect(fila(page, "ALUMNO PRUEBA UNO")).toBeVisible();
  await expect(fila(page, "ALUMNO PRUEBA DOS")).toHaveCount(0);

  await page.goto("/alumnos");
  await page.getByRole("link", { name: "Sin alta" }).click();
  await expect(fila(page, "ALUMNO PRUEBA DOS")).toBeVisible();
  await expect(fila(page, "ALUMNO PRUEBA TRES")).toBeVisible();
  await expect(fila(page, "ALUMNO PRUEBA UNO")).toHaveCount(0);

  await page.goto("/alumnos?q=zzzz");
  await expect(page.getByText("No hay alumnos con esa búsqueda o filtro.")).toBeVisible();
});

test("la vista rápida abre un modal y lleva a la ficha completa", async ({ page }) => {
  await page.goto("/alumnos");
  await page.getByRole("button", { name: "ALUMNO PRUEBA UNO" }).click();
  const dlg = page.getByRole("dialog");
  await expect(dlg).toContainText("CÓDIGO BU0098");
  await expect(dlg).toContainText("Rosa Prueba");
  await expect(dlg).toContainText("9•• ••• 321"); // teléfono enmascarado
  await dlg.getByRole("link", { name: "Ver ficha completa" }).click();
  await expect(page).toHaveURL(new RegExp(`/alumnos/${S1}$`));
  await expect(page.getByRole("heading", { name: "ALUMNO PRUEBA UNO", level: 2 })).toBeVisible();
});

test("dar de baja pide el motivo, cambia el estado y se puede reactivar", async ({ page }) => {
  await page.goto(`/alumnos/${S1}`);
  await expect(page.getByText("Beneficiario activo")).toBeVisible();

  await page.getByRole("button", { name: "Dar de baja" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByRole("button", { name: "Dar de baja" }).click(); // sin motivo
  await expect(dlg.getByRole("alert")).toHaveText("Escribe el motivo para continuar.");

  await dlg.getByLabel(/Motivo de la baja/).fill("Cambio de colegio");
  await dlg.getByRole("button", { name: "Dar de baja" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(/Dado de baja el/)).toBeVisible();
  await expect(page.getByText(/Motivo: Cambio de colegio/)).toBeVisible();

  await page.getByRole("button", { name: "Reactivar" }).click();
  await expect(page.getByText("Beneficiario activo")).toBeVisible();
});

test("el motivo no puede pasar de 200 caracteres", async ({ page }) => {
  await page.goto(`/alumnos/${S1}`);
  await page.getByRole("button", { name: "Dar de baja" }).click();
  const campo = page.getByRole("dialog").getByLabel(/Motivo de la baja/);
  await campo.fill("x".repeat(300));
  await expect(campo).toHaveValue("x".repeat(200));
});

test("alumno sin código avisa que no se puede emitir carnet; alta lo vuelve beneficiario", async ({ page }) => {
  await page.goto(`/alumnos/${S3}`);
  await expect(page.getByText(/no tiene código en el padrón/)).toBeVisible();
  await page.getByRole("button", { name: "Dar de alta" }).click();
  await expect(page.getByText("Beneficiario activo")).toBeVisible();
});

test("un id inválido o inexistente muestra la pantalla 404", async ({ page }) => {
  await page.goto("/alumnos/no-es-un-uuid");
  await expect(page.getByText("Esta página no existe")).toBeVisible();
  await page.goto("/alumnos/a0000000-0000-0000-0000-0000000000ff");
  await expect(page.getByText("Esta página no existe")).toBeVisible();
});
