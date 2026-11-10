import { defineConfig } from "vitest/config";

// Playwright usa e2e/*.spec.ts; Vitest solo los *.test.ts.
export default defineConfig({ test: { include: ["lib/**/*.test.ts", "e2e/helpers/*.test.ts"] } });
