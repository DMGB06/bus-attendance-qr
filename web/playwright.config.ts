import { defineConfig } from "@playwright/test";
import { loadEnvFile } from "node:process";

try { loadEnvFile(".env.test.local"); } catch { /* sin archivo: loginComoAdmin avisa */ }

// channel "msedge" usa el Edge ya instalado en Windows: no descarga navegadores.
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  workers: 1,
  use: { baseURL: "http://localhost:3000", channel: "msedge" },
  webServer: { command: "npm run dev", url: "http://localhost:3000/login", reuseExistingServer: true, timeout: 120_000 },
});
