/**
 * Verificación en vivo: Edge Function send-attendance-push + tablas Supabase.
 *
 * Uso:
 *   cd mobile
 *   npm run test:push
 *
 * Requiere en mobile/.env (no commitear service role):
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=...   (Settings → API → secret key)
 *
 * Opcional:
 *   PUSH_VERIFY_GUARDIAN_ID=uuid-padre
 *   PUSH_VERIFY_STUDENT_ID=uuid-alumno
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, "..");
const envPath = path.join(mobileRoot, ".env");
const reportPath = path.join(__dirname, "PUSH-VERIFY-LAST-RUN.md");

const PUSH_TABLES = [
  "device_push_tokens",
  "guardian_notification_preferences",
  "notification_log",
  "push_webhook_receipts",
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(envPath);

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_SECRET_KEY?.trim();
const guardianId = process.env.PUSH_VERIFY_GUARDIAN_ID?.trim();
const studentId = process.env.PUSH_VERIFY_STUDENT_ID?.trim();

const checks = [];

function pass(name, detail) {
  checks.push({ ok: true, name, detail });
}

function fail(name, detail) {
  checks.push({ ok: false, name, detail });
}

function skip(name, detail) {
  checks.push({ ok: null, name, detail });
}

function projectRefFromUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

async function supabaseRest(pathname, options = {}) {
  const url = `${supabaseUrl}/rest/v1/${pathname}`;
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  return { response, json, text };
}

async function invokeEdgeFunction(body) {
  const projectRef = projectRefFromUrl(supabaseUrl);
  const url = `${supabaseUrl}/functions/v1/send-attendance-push`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  return { status: response.status, json, text };
}

async function main() {
  if (!supabaseUrl) {
    fail("Variables de entorno", "Falta EXPO_PUBLIC_SUPABASE_URL en mobile/.env");
  } else {
    pass("Supabase URL", supabaseUrl);
  }

  if (!serviceRoleKey) {
    fail(
      "Service role key",
      "Falta SUPABASE_SERVICE_ROLE_KEY en mobile/.env (Project Settings → API → secret key). No uses la anon key.",
    );
  } else {
    pass("Service role key", "Configurada (no se muestra por seguridad)");
  }

  if (!supabaseUrl || !serviceRoleKey) {
    writeReport();
    process.exit(1);
  }

  for (const table of PUSH_TABLES) {
    try {
      const { response } = await supabaseRest(`${table}?select=id&limit=1`, {
        headers: { Accept: "application/json", "Accept-Profile": "buscontrol" },
      });

      if (response.status === 200 || response.status === 206) {
        pass(`Tabla buscontrol.${table}`, "Accesible");
      } else if (response.status === 404) {
        fail(`Tabla buscontrol.${table}`, `No existe (HTTP ${response.status}). Ejecuta migraciones 004, 009 y 015.`);
      } else {
        fail(`Tabla buscontrol.${table}`, `HTTP ${response.status}`);
      }
    } catch (error) {
      fail(`Tabla buscontrol.${table}`, error instanceof Error ? error.message : String(error));
    }
  }

  try {
    const { status, json, text } = await invokeEdgeFunction({
      record: { id: "00000000-0000-0000-0000-000000000000" },
    });

    if (status === 500 && String(text).includes("WEBHOOK_SECRET is not configured")) {
      fail(
        "Edge Function send-attendance-push",
        "Versión VIEJA desplegada (error WEBHOOK_SECRET). Redeploy: supabase functions deploy send-attendance-push --project-ref "
          + (projectRefFromUrl(supabaseUrl) ?? "?") + " --no-verify-jwt",
      );
    } else if (status === 401) {
      fail(
        "Edge Function send-attendance-push",
        "401 Unauthorized — agrega header apikey al webhook o redeploya la función nueva.",
      );
    } else if (status === 200 && json?.skipped) {
      pass(
        "Edge Function send-attendance-push",
        `Responde OK (${status}, skipped: ${json.reason ?? "ok"}) — función desplegada y auth correcta`,
      );
    } else if (status >= 200 && status < 300) {
      pass("Edge Function send-attendance-push", `HTTP ${status}: ${JSON.stringify(json)}`);
    } else {
      fail("Edge Function send-attendance-push", `HTTP ${status}: ${text.slice(0, 300)}`);
    }
  } catch (error) {
    fail("Edge Function send-attendance-push", error instanceof Error ? error.message : String(error));
  }

  if (studentId) {
    try {
      const { response, json } = await fetch(
        `${supabaseUrl}/rest/v1/rpc/guardian_user_ids_for_student`,
        {
          method: "POST",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
            "Content-Profile": "buscontrol",
          },
          body: JSON.stringify({ p_student_id: studentId }),
        },
      ).then(async (res) => ({
        response: res,
        json: res.ok ? await res.json() : await res.text(),
      }));

      if (response.ok && Array.isArray(json) && json.length > 0) {
        pass(
          "Vínculo padre ↔ alumno (RPC)",
          `${json.length} apoderado(s) para student ${studentId.slice(0, 8)}…`,
        );
      } else if (response.ok && Array.isArray(json) && json.length === 0) {
        fail(
          "Vínculo padre ↔ alumno (RPC)",
          "Sin apoderados vinculados — revisa bus_student_guardians / student_guardians",
        );
      } else {
        fail("Vínculo padre ↔ alumno (RPC)", `HTTP ${response.status}: ${JSON.stringify(json)}`);
      }
    } catch (error) {
      fail("Vínculo padre ↔ alumno (RPC)", error instanceof Error ? error.message : String(error));
    }
  } else {
    skip(
      "Vínculo padre ↔ alumno (RPC)",
      "Opcional: define PUSH_VERIFY_STUDENT_ID en .env (ej. Cristofer)",
    );
  }

  if (guardianId) {
    try {
      const { response, json } = await supabaseRest(
        `device_push_tokens?user_id=eq.${guardianId}&is_active=eq.true&select=id,platform,updated_at&limit=5`,
        { headers: { Accept: "application/json", "Accept-Profile": "buscontrol" } },
      );

      if (response.ok && Array.isArray(json) && json.length > 0) {
        pass(
          "Token push del padre",
          `${json.length} token(s) activo(s). Último: ${json[0]?.updated_at ?? "—"}`,
        );
      } else if (response.ok) {
        fail(
          "Token push del padre",
          "Sin tokens activos — abre la app como padre en APK/dev client y acepta notificaciones",
        );
      } else {
        fail("Token push del padre", `HTTP ${response.status}`);
      }
    } catch (error) {
      fail("Token push del padre", error instanceof Error ? error.message : String(error));
    }

    try {
      const { response, json } = await supabaseRest(
        `notification_log?guardian_user_id=eq.${guardianId}&select=created_at,event_key,delivery_status,title&order=created_at.desc&limit=3`,
        { headers: { Accept: "application/json", "Accept-Profile": "buscontrol" } },
      );

      if (response.ok && Array.isArray(json) && json.length > 0) {
        const last = json[0];
        pass(
          "Historial notification_log",
          `Último: ${last.delivery_status} · ${last.event_key} · ${last.created_at}`,
        );
      } else if (response.ok) {
        fail(
          "Historial notification_log",
          "Vacío — escanea un alumno tras arreglar webhook/función, o revisa Invocations en Supabase",
        );
      } else {
        fail("Historial notification_log", `HTTP ${response.status}`);
      }
    } catch (error) {
      fail("Historial notification_log", error instanceof Error ? error.message : String(error));
    }
  } else {
    skip(
      "Token push / notification_log",
      "Opcional: define PUSH_VERIFY_GUARDIAN_ID en .env (UUID del padre de prueba)",
    );
  }

  writeReport();
  const failed = checks.some((c) => c.ok === false);
  process.exit(failed ? 1 : 0);
}

function writeReport() {
  const passed = checks.filter((c) => c.ok === true).length;
  const failed = checks.filter((c) => c.ok === false).length;
  const skipped = checks.filter((c) => c.ok === null).length;

  const lines = [
    "# BusControl — verificación push (Supabase en vivo)",
    "",
    `Generado: ${new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })}`,
    "",
    `**${passed} OK** · **${failed} fallos** · **${skipped} omitidos**`,
    "",
  ];

  for (const check of checks) {
    const icon = check.ok === true ? "✅" : check.ok === false ? "❌" : "⏭️";
    lines.push(`## ${icon} ${check.name}`, "", check.detail, "");
  }

  if (failed === 0) {
    lines.push(
      "## Siguiente paso",
      "",
      "Si todo OK pero no llega push al celular: escanea con chofer y revisa que el padre tenga token en APK (no web/Expo Go).",
      "",
    );
  } else {
    lines.push(
      "## Cómo corregir",
      "",
      "1. Redeploy función: `supabase functions deploy send-attendance-push --project-ref pbqgpvwbnkialeiooopp --no-verify-jwt`",
      "2. Webhook `attendance-push`: header `apikey` = secret key del proyecto",
      "3. Padre en APK con permiso de notificaciones",
      "",
    );
  }

  fs.writeFileSync(reportPath, lines.join("\n"), "utf8");
  console.log(lines.join("\n"));
  console.log(`\nReporte guardado en: ${reportPath}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
