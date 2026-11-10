// Cuentas de login de apoderados (padres) para el panel web. Unico lugar con service_role.
// Solo la llama el administrador web: sesion valida, MFA completo (aal2) e is_web_admin().
// Ver README.md en esta carpeta.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { temporaryPassword } from "./lib/password.ts";

type Action = "create" | "reset_password" | "deactivate" | "reactivate";
const ACTIONS: Action[] = ["create", "reset_password", "deactivate", "reactivate"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BAN_FOREVER = "876000h"; // ~100 anios: bloquea el login hasta reactivar

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

// El JWT ya fue validado por auth.getUser(); aqui solo se lee el nivel de MFA.
function aalOf(jwt: string): string | undefined {
  try {
    const payload = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).aal;
  } catch {
    return undefined;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Debes iniciar sesión." }, 401);

  // Cliente con la sesion del administrador: las funciones de la base verifican el rol con auth.uid().
  const asAdmin = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: u, error: uErr } = await asAdmin.auth.getUser(jwt);
  if (uErr || !u.user) return json({ error: "Debes iniciar sesión." }, 401);
  if (aalOf(jwt) !== "aal2") return json({ error: "Falta la verificación en dos pasos." }, 403);
  const { data: isAdmin } = await asAdmin.schema("buscontrol").rpc("is_web_admin");
  if (isAdmin !== true) return json({ error: "No autorizado." }, 403);

  let body: { action?: string; guardian_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Solicitud inválida." }, 400);
  }
  const action = body.action as Action;
  const guardianId = body.guardian_id ?? "";
  if (!ACTIONS.includes(action) || !UUID.test(guardianId)) return json({ error: "Solicitud inválida." }, 400);

  const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
  const bc = svc.schema("buscontrol");

  const { data: g } = await bc.from("bus_guardians").select("id, full_name, email, auth_user_id, is_active").eq("id", guardianId).maybeSingle();
  if (!g) return json({ error: "Apoderado no encontrado." }, 404);

  if (action === "create") {
    if (g.auth_user_id) return json({ error: "El apoderado ya tiene cuenta." }, 409);
    if (!g.is_active) return json({ error: "El apoderado está desactivado." }, 422);
    if (!g.email) return json({ error: "Agrega un correo al apoderado para crear su cuenta." }, 422);

    const password = temporaryPassword();
    const { data: created, error: cErr } = await svc.auth.admin.createUser({
      email: g.email, password, email_confirm: true, user_metadata: { full_name: g.full_name },
    });
    // Mensaje unico: no se revela si el correo ya existia en Auth.
    if (cErr || !created.user) return json({ error: "No se pudo crear la cuenta con ese correo." }, 409);
    const uid = created.user.id;

    const undo = async () => {
      await bc.from("app_profiles").delete().eq("id", uid);
      await svc.auth.admin.deleteUser(uid);
    };
    const { error: pErr } = await bc.from("app_profiles").upsert({ id: uid, email: g.email, full_name: g.full_name, app_role: "padre", is_active: true });
    if (pErr) { await undo(); return json({ error: "No se pudo crear la cuenta." }, 500); }
    const { error: lErr } = await asAdmin.schema("buscontrol").rpc("link_guardian_account", { p_guardian_id: g.id, p_auth_user_id: uid });
    if (lErr) { await undo(); return json({ error: "No se pudo crear la cuenta." }, 500); }
    return json({ email: g.email, temporary_password: password });
  }

  // Las demas acciones necesitan una cuenta existente.
  if (!g.auth_user_id) return json({ error: "El apoderado no tiene cuenta." }, 409);
  const uid = g.auth_user_id as string;
  let audit: string;

  if (action === "reset_password") {
    const password = temporaryPassword();
    const { error } = await svc.auth.admin.updateUserById(uid, { password });
    if (error) return json({ error: "No se pudo reiniciar la contraseña." }, 500);
    audit = "guardian_account_reset_password";
    await asAdmin.schema("buscontrol").rpc("log_guardian_account_action", { p_guardian_id: g.id, p_action: audit });
    return json({ email: g.email, temporary_password: password });
  }

  const active = action === "reactivate";
  // Si la cuenta ya esta en el estado pedido (perfil y bloqueo de Auth coinciden) no se toca nada ni se audita: asi la web
  // puede llamar sin saber el estado actual y un reintento no duplica el registro.
  const [{ data: perfil }, { data: actual }] = await Promise.all([
    bc.from("app_profiles").select("is_active").eq("id", uid).maybeSingle(),
    svc.auth.admin.getUserById(uid),
  ]);
  const bloqueada = !!actual?.user?.banned_until && new Date(actual.user.banned_until).getTime() > Date.now();
  if (perfil && perfil.is_active === active && bloqueada === !active) return json({ ok: true, sin_cambios: true });
  const { error: aErr } = await bc.from("app_profiles").update({ is_active: active }).eq("id", uid);
  const { error: bErr } = await svc.auth.admin.updateUserById(uid, { ban_duration: active ? "none" : BAN_FOREVER });
  if (aErr || bErr) return json({ error: "No se pudo cambiar el estado de la cuenta." }, 500);
  audit = active ? "guardian_account_reactivate" : "guardian_account_deactivate";
  await asAdmin.schema("buscontrol").rpc("log_guardian_account_action", { p_guardian_id: g.id, p_action: audit });
  return json({ ok: true });
});
