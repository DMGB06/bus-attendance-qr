/**
 * Ejecuta lint + todos los tests y escribe un reporte legible en testS/LAST-RUN.md
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, "..");
const reportPath = path.join(__dirname, "LAST-RUN.md");
const jsonPath = path.join(__dirname, "jest-output.json");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: mobileRoot,
    encoding: "utf8",
    shell: true,
  });

  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function section(title, ok, details) {
  return `## ${ok ? "✅" : "❌"} ${title}\n\n${details}\n`;
}

const lines = [
  `# BusControl — reporte de pruebas`,
  ``,
  `Generado: ${new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })}`,
  ``,
];

const lint = run("npm", ["run", "lint"]);
lines.push(
  section(
    "Lint (eslint)",
    lint.ok,
    lint.ok ? "Sin errores de lint." : `\n${lint.stdout}\n${lint.stderr}\n`,
  ),
);

const jest = run("npm", [
  "test",
  "--",
  "--json",
  "--outputFile=testS/jest-output.json",
  "--testLocationInResults",
]);

let jestDetails = "";
let jestOk = jest.ok;

if (fs.existsSync(jsonPath)) {
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  jestOk = data.success;
  const failed = data.testResults.filter((suite) => suite.status === "failed");
  const passed = data.numPassedTests;
  const total = data.numTotalTests;

  jestDetails += `**${passed}/${total}** tests pasaron en **${data.numPassedTestSuites}/${data.numTotalTestSuites}** suites.\n\n`;

  if (failed.length > 0) {
    jestDetails += "### Fallos\n\n";
    for (const suite of failed) {
      jestDetails += `- **${suite.name}**\n`;
      for (const test of suite.assertionResults.filter((t) => t.status === "failed")) {
        jestDetails += `  - \`${test.fullName}\`\n`;
        const msg = (test.failureMessages?.[0] ?? "").trim().slice(0, 500);
        jestDetails += `  - mensaje: ${msg.replace(/\n/g, " ")}\n`;
      }
    }
  } else {
    jestDetails += "Todos los tests automatizados pasaron.\n";
  }
} else {
  jestDetails = `No se generó jest-output.json\n\n${jest.stdout}\n${jest.stderr}`;
  jestOk = false;
}

lines.push(section("Tests Jest (src + testS)", jestOk, jestDetails));

lines.push(
  "## Próximo paso manual\n\n",
  "Lo que Jest **no** puede probar (Supabase, push, cámara, GPS) está en ",
  "`testS/CHECKLIST-MANUAL.md`.\n",
);

fs.writeFileSync(reportPath, lines.join("\n"), "utf8");

console.log(lines.join("\n"));
console.log(`\nReporte guardado en: ${reportPath}\n`);

process.exit(lint.ok && jestOk ? 0 : 1);
