// Prueba de integracion contra Supabase LOCAL (no toca produccion).
// Requisitos: `supabase start`, `supabase functions serve guardian-account`, migracion 032 aplicada y
// web/.env.test.local con E2E_ADMIN_* (administrador local con MFA). Uso: node supabase/functions/guardian-account/test.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const root = new URL("../../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const { createClient } = createRequire(root + "web/package.json")("@supabase/supabase-js");
const { totp } = await import("file:///" + root + "web/e2e/helpers/totp.ts");

const kv = (text) => Object.fromEntries(text.split(/\r?\n/).filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }));
const env = kv(execSync("supabase status -o env", { cwd: root }).toString());
const e2e = kv(readFileSync(root + "web/.env.test.local", "utf8"));
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(env.API_URL)) throw new Error("No es Supabase local");

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const svc = createClient(env.API_URL, env.SERVICE_ROLE_KEY, opts);
const bc = svc.schema("buscontrol");

async function call(token, body) {
  const r = await fetch(env.API_URL + "/functions/v1/guardian-account", {
    method: "POST",
    headers: { "content-type": "application/json", apikey: env.ANON_KEY, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
async function login(email, password) {
  const c = createClient(env.API_URL, env.ANON_KEY, opts);
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  return { client: c, session: data?.session, error };
}

const results = [];
const check = (name, fn) => results.push([name, fn]);
const made = { guardians: [], users: [] };

// Sesion de administrador: aal1 (solo clave) y aal2 (con MFA)
const adm = await login(e2e.E2E_ADMIN_EMAIL, e2e.E2E_ADMIN_PASSWORD);
assert.ok(adm.session, "no se pudo iniciar sesion como administrador de pruebas");
const aal1 = adm.session.access_token;
const { data: factors } = await adm.client.auth.mfa.listFactors();
const factor = factors.totp[0];
const { data: ch } = await adm.client.auth.mfa.challenge({ factorId: factor.id });
const { error: vErr } = await adm.client.auth.mfa.verify({ factorId: factor.id, challengeId: ch.id, code: totp(e2e.E2E_ADMIN_TOTP_SECRET) });
assert.ok(!vErr, "MFA: " + vErr?.message);
const aal2 = (await adm.client.auth.getSession()).data.session.access_token;

const mk = async (full_name, email) => {
  const { data, error } = await bc.from("bus_guardians").insert({ full_name, email }).select("id").single();
  assert.ok(!error, error?.message);
  made.guardians.push(data.id);
  return data.id;
};
const tag = Date.now();
const gOk = await mk("Padre Cuenta Prueba", `padre-cuenta-${tag}@buscontrol.local`);
const gNoMail = await mk("Sin Correo Prueba", null);
const gDup = await mk("Correo Repetido Prueba", "padre@test.local"); // ya existe en Auth

let pass1, pass2, parentToken;

check("sin token: 401", async () => assert.equal((await call(null, { action: "create", guardian_id: gOk })).status, 401));
check("administrador sin MFA (aal1): 403", async () => assert.equal((await call(aal1, { action: "create", guardian_id: gOk })).status, 403));
check("accion invalida: 400", async () => assert.equal((await call(aal2, { action: "borrar", guardian_id: gOk })).status, 400));
check("guardian_id invalido: 400", async () => assert.equal((await call(aal2, { action: "create", guardian_id: "x" })).status, 400));
check("sin correo: 422", async () => assert.equal((await call(aal2, { action: "create", guardian_id: gNoMail })).status, 422));
check("sin cuenta no se puede reiniciar: 409", async () => assert.equal((await call(aal2, { action: "reset_password", guardian_id: gOk })).status, 409));

check("crear cuenta: 200 y contrasena valida", async () => {
  const r = await call(aal2, { action: "create", guardian_id: gOk });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  pass1 = r.body.temporary_password;
  assert.match(pass1, /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/);
});
check("perfil queda como padre activo y apoderado ligado", async () => {
  const { data: g } = await bc.from("bus_guardians").select("auth_user_id").eq("id", gOk).single();
  assert.ok(g.auth_user_id);
  made.users.push(g.auth_user_id);
  const { data: p } = await bc.from("app_profiles").select("app_role,is_active").eq("id", g.auth_user_id).single();
  assert.deepEqual(p, { app_role: "padre", is_active: true });
});
check("el padre inicia sesion con la contrasena temporal", async () => {
  const l = await login(`padre-cuenta-${tag}@buscontrol.local`, pass1);
  assert.ok(l.session, l.error?.message);
  parentToken = l.session.access_token;
});
check("el padre no puede usar la funcion: 403", async () => assert.equal((await call(parentToken, { action: "reset_password", guardian_id: gOk })).status, 403));
check("crear otra vez: 409", async () => assert.equal((await call(aal2, { action: "create", guardian_id: gOk })).status, 409));
check("correo repetido: 409 sin crear nada", async () => {
  const r = await call(aal2, { action: "create", guardian_id: gDup });
  assert.equal(r.status, 409);
  assert.equal(r.body.temporary_password, undefined);
  const { data: g } = await bc.from("bus_guardians").select("auth_user_id").eq("id", gDup).single();
  assert.equal(g.auth_user_id, null);
});

check("reiniciar contrasena: la vieja deja de servir, la nueva sirve", async () => {
  const r = await call(aal2, { action: "reset_password", guardian_id: gOk });
  assert.equal(r.status, 200);
  pass2 = r.body.temporary_password;
  assert.notEqual(pass2, pass1);
  assert.ok((await login(`padre-cuenta-${tag}@buscontrol.local`, pass1)).error, "la clave vieja sigue sirviendo");
  assert.ok((await login(`padre-cuenta-${tag}@buscontrol.local`, pass2)).session);
});

check("desactivar: perfil inactivo, login bloqueado y sin renovar sesion", async () => {
  const live = await login(`padre-cuenta-${tag}@buscontrol.local`, pass2);
  assert.ok(live.session);
  const r = await call(aal2, { action: "deactivate", guardian_id: gOk });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const { data: p } = await bc.from("app_profiles").select("is_active").eq("id", made.users[0]).single();
  assert.equal(p.is_active, false);
  assert.ok((await login(`padre-cuenta-${tag}@buscontrol.local`, pass2)).error, "el login sigue funcionando");
  const { error } = await live.client.auth.refreshSession();
  assert.ok(error, "la sesion abierta se pudo renovar");
});
check("reactivar: vuelve a iniciar sesion", async () => {
  const r = await call(aal2, { action: "reactivate", guardian_id: gOk });
  assert.equal(r.status, 200);
  assert.ok((await login(`padre-cuenta-${tag}@buscontrol.local`, pass2)).session);
  const { data: p } = await bc.from("app_profiles").select("is_active").eq("id", made.users[0]).single();
  assert.equal(p.is_active, true);
});
check("repetir reactivar y desactivar no cambia nada ni duplica la auditoria", async () => {
  const r1 = await call(aal2, { action: "reactivate", guardian_id: gOk });
  assert.equal(r1.status, 200);
  assert.equal(r1.body.sin_cambios, true, "reactivar una cuenta ya activa debe ser sin_cambios");
  assert.ok((await login(`padre-cuenta-${tag}@buscontrol.local`, pass2)).session, "la cuenta dejo de servir");
  const a = await call(aal2, { action: "deactivate", guardian_id: gOk });
  assert.equal(a.status, 200);
  assert.ok((await login(`padre-cuenta-${tag}@buscontrol.local`, pass2)).error);
  const b = await call(aal2, { action: "deactivate", guardian_id: gOk });
  assert.equal(b.body.sin_cambios, true, "desactivar una cuenta ya bloqueada debe ser sin_cambios");
  const c = await call(aal2, { action: "reactivate", guardian_id: gOk });
  assert.equal(c.status, 200);
  assert.ok((await login(`padre-cuenta-${tag}@buscontrol.local`, pass2)).session);
});
check("auditoria: una fila por accion y ninguna con la contrasena", async () => {
  const { data } = await bc.from("admin_audit_log").select("action,details").eq("entity_id", gOk);
  const n = (a) => data.filter((x) => x.action === a).length;
  // deactivate y reactivate corren dos veces (el repetido sin cambios no se audita): 2 filas cada uno, no 3.
  for (const a of ["guardian_account_link", "guardian_account_reset_password"]) assert.equal(n(a), 1, a);
  for (const a of ["guardian_account_deactivate", "guardian_account_reactivate"]) assert.equal(n(a), 2, a);
  assert.ok(!JSON.stringify(data).includes(pass1) && !JSON.stringify(data).includes(pass2));
});

let failed = 0;
for (const [name, fn] of results) {
  try { await fn(); console.log("  ok   " + name); } catch (e) { failed++; console.log("  FALLA " + name + "\n        " + e.message); }
}

// Limpieza
for (const id of made.guardians) await bc.from("bus_guardians").delete().eq("id", id);
for (const id of made.users) { await bc.from("app_profiles").delete().eq("id", id); await svc.auth.admin.deleteUser(id); }
console.log(failed ? `\n${failed} FALLAS` : `\n${results.length} de ${results.length} pasan`);
process.exit(failed ? 1 : 0);
