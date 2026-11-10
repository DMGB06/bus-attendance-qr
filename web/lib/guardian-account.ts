import "server-only";
import type { createClient } from "./supabase";

export type CuentaAccion = "create" | "reset_password" | "deactivate" | "reactivate";
export type CuentaResultado = { ok: true; email?: string; temporary_password?: string } | { ok: false; error: string };

// Llama a la Edge Function guardian-account con la sesión del administrador (la función exige MFA completo).
export async function guardianAccount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  action: CuentaAccion,
  guardianId: string,
): Promise<CuentaResultado> {
  const { data, error } = await supabase.functions.invoke("guardian-account", { body: { action, guardian_id: guardianId } });
  if (error) {
    // La función responde { error } en español y sin detalles internos.
    let message = "No se pudo completar la acción de la cuenta.";
    try {
      const body = await (error as { context?: Response }).context?.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {}
    return { ok: false, error: message };
  }
  return { ok: true, email: data?.email, temporary_password: data?.temporary_password };
}
