import { expect, test } from "@playwright/test";
import { loginComoAdmin } from "./helpers/login";

test("el administrador entra al panel", async ({ page }) => {
  await loginComoAdmin(page);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("el panel tiene zona principal y un enlace para saltar el menú con el teclado", async ({ page }) => {
  await loginComoAdmin(page);
  await expect(page.getByRole("main")).toHaveCount(1);
  await page.keyboard.press("Tab");
  const saltar = page.getByRole("link", { name: "Saltar al contenido" });
  await expect(saltar).toBeFocused();
  await expect(saltar).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("#contenido")).toBeFocused();
});

test("la sesión se renueva sin escribir la cookie de actividad en cada petición", async ({ page }) => {
  await loginComoAdmin(page);
  const actividad = async () => (await page.context().cookies()).find((c) => c.name === "cb-activity")?.value;
  const antes = await actividad();
  expect(antes).toBeTruthy();
  await page.goto("/alumnos");
  await page.goto("/qr");
  expect(await actividad()).toBe(antes); // dentro del mismo minuto no se reescribe
});
