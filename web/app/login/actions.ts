"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { logSession, safeNext } from "@/lib/auth";
import { REMEMBER_COOKIE } from "@/lib/cookie-options";

export type FormState = { error?: string; email?: string; qr?: string; secret?: string } | undefined;

const INVALID = "Correo o contraseña incorrectos.";


const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(12).max(128),
  captcha: z.string().max(4096).optional(),
});

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    password: form.get("password"),
    captcha: form.get("cf-turnstile-response") ?? undefined,
  });
  const typed = String(form.get("email") ?? "").slice(0, 254);
  if (!parsed.success) return { error: INVALID, email: typed };

  const { email, password, captcha } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken: captcha } });
  if (error) {
    if (error.status === 429) return { error: "Demasiados intentos. Espera unos minutos y vuelve a intentar.", email: typed };
    if (error.code?.startsWith("captcha")) return { error: "Completa la verificación de seguridad.", email: typed };
    return { error: INVALID, email: typed };
  }

  // Un rol movil con contrasena correcta recibe el mismo mensaje: no se revela que la cuenta existe.
  const { data: isAdmin } = await supabase.rpc("is_web_admin");
  if (isAdmin !== true) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: INVALID, email: typed };
  }

  const store = await cookies();
  if (form.get("remember") === "on") {
    store.set(REMEMBER_COOKIE, email, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 180, path: "/" });
  } else {
    store.delete({ name: REMEMBER_COOKIE, path: "/" });
  }

  redirect(`/login/mfa?next=${encodeURIComponent(safeNext(form.get("next")))}`);
}

// Primera vez: crea el factor TOTP y devuelve el QR. Borra factores sin verificar de intentos anteriores.
export async function startEnroll(): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: isAdmin } = await supabase.rpc("is_web_admin");
  if (isAdmin !== true) redirect("/login");

  const { data: factors } = await supabase.auth.mfa.listFactors();
  if (factors?.totp.length) redirect("/login/mfa");
  for (const f of factors?.all ?? []) {
    if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "CerroBus web" });
  if (error) return { error: "No se pudo iniciar la configuración. Intenta de nuevo." };
  return { qr: data.totp.qr_code, secret: data.totp.secret };
}

export async function verifyCode(prev: FormState, form: FormData): Promise<FormState> {
  const code = z.string().regex(/^\d{6}$/).safeParse(form.get("code"));
  if (!code.success) return { ...prev, error: "El código debe tener 6 dígitos." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: isAdmin } = await supabase.rpc("is_web_admin");
  if (isAdmin !== true) redirect("/login");

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp[0] ?? factors?.all.find((f) => f.factor_type === "totp" && f.status === "unverified");
  if (!factor) redirect("/login/mfa");

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.data });
  if (error) {
    if (error.status === 429) return { ...prev, error: "Demasiados intentos. Espera unos minutos." };
    return { ...prev, error: "Código incorrecto o vencido." };
  }

  await logSession(supabase, "login");
  redirect(safeNext(form.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await logSession(supabase, "logout");
  // La sesion local se cierra siempre, aunque el token ya haya vencido y Auth no lo reconozca.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

export async function backToLogin() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
