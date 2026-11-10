import type { Page } from "@playwright/test";
import { totp } from "./totp";

// Variables en web/.env.test.local (ignorado por git): E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_ADMIN_TOTP_SECRET.
export async function loginComoAdmin(page: Page) {
  const { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_ADMIN_TOTP_SECRET } = process.env;
  if (!E2E_ADMIN_EMAIL || !E2E_ADMIN_PASSWORD || !E2E_ADMIN_TOTP_SECRET) throw new Error("Faltan variables E2E_ADMIN_* en .env.test.local");
  await page.goto("/login");
  await page.getByLabel("Correo", { exact: true }).fill(E2E_ADMIN_EMAIL);
  await page.getByLabel("Contraseña", { exact: true }).fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.getByLabel("Código", { exact: true }).fill(totp(E2E_ADMIN_TOTP_SECRET));
  await page.getByRole("button", { name: "Verificar" }).click();
  await page.waitForURL("/");
}
