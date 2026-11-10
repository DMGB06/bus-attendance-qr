import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isIP } from "node:net";
import { createClient } from "./supabase";

// Solo rutas internas: evita redirecciones abiertas (//otro.com, /\otro.com, https://...).
export function safeNext(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }
  return value.startsWith("/login") ? "/" : value;
}

// PAGINAS: sesion (firma del token verificada en el servidor, sin llamada de red), MFA completo y rol de administrador.
// Es la unica ida a la base por pagina: cache() hace que el layout y la pagina compartan el resultado en la misma peticion.
// Un token vigente de alguien bloqueado sigue sirviendo hasta que vence (1 hora); por eso las ACCIONES que escriben
// usan requireAdminAction, que si le pregunta a Auth.
export const requireAdmin = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_web_admin");
  if (isAdmin !== true) redirect("/login");
  if (claims.aal !== "aal2") redirect("/login/mfa");

  return { supabase };
});

// ACCIONES que escriben: ademas de lo anterior, getUser() confirma con Auth que la sesion sigue viva (no revocada ni bloqueada).
export async function requireAdminAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_web_admin");
  if (isAdmin !== true) redirect("/login");

  const { data } = await supabase.auth.getClaims();
  if (data?.claims.aal !== "aal2") redirect("/login/mfa");

  return { supabase, user };
}

// La IP es solo informativa. Se prefiere la cabecera que pone la plataforma (no la puede falsear el cliente) y
// se descarta lo que no sea una IP valida.
export async function ipDelCliente() {
  const h = await headers();
  const candidatos = [h.get("x-vercel-forwarded-for"), h.get("x-real-ip"), h.get("x-forwarded-for")?.split(",")[0]];
  return candidatos.map((c) => c?.trim() ?? "").find((c) => c && isIP(c)) ?? "";
}

export async function logSession(supabase: Awaited<ReturnType<typeof createClient>>, action: "login" | "logout") {
  const h = await headers();
  await supabase.rpc("log_admin_session", { p_action: action, p_ip: await ipDelCliente(), p_user_agent: h.get("user-agent") ?? "" });
}
