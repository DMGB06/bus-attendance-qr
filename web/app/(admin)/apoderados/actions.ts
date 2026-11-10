"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireAdminAction } from "@/lib/auth";
import { guardianAccount } from "@/lib/guardian-account";
import { apoderadoSchema, idSchema, vincularSchema, vinculoSchema } from "@/lib/schemas/apoderados";

// values: lo que escribió el usuario, para que React 19 no vacíe el formulario cuando hay un error.
export type Estado = { error?: string; ok?: true; values?: Record<string, string> } | undefined;
export type Reveal = { ok: true; email: string; password: string } | { ok: false; error: string };
export type AlumnoOpcion = { id: string; nombre: string; codigo: string | null; estado: string };

// Los mensajes de la base de datos están en español y no traen detalles internos, pero solo se muestran los conocidos.
const CONOCIDOS = /^(Ya existe un apoderado|Teléfono inválido|DNI inválido|Correo inválido|Nombre obligatorio|El apoderado ya está vinculado|Alumno no encontrado|Apoderado no encontrado|El apoderado no está vinculado)/;
const mensaje = (e: { message?: string } | null, general: string) => (e?.message && CONOCIDOS.test(e.message) ? e.message : general);

const valores = (form: FormData) =>
  Object.fromEntries(["fullName", "dni", "phone", "email", "notes"].map((k) => [k, String(form.get(k) ?? "")]));

function campos(form: FormData) {
  return apoderadoSchema.safeParse({
    fullName: form.get("fullName"), dni: form.get("dni") ?? "", phone: form.get("phone") ?? "", email: form.get("email") ?? "", notes: form.get("notes") ?? "",
  });
}

export async function crearApoderado(_: Estado, form: FormData): Promise<Estado> {
  const { supabase } = await requireAdminAction();
  const p = campos(form);
  if (!p.success) return { error: p.error.issues[0].message, values: valores(form) };
  const { data, error } = await supabase.rpc("create_guardian", {
    p_full_name: p.data.fullName, p_phone: p.data.phone, p_dni: p.data.dni, p_email: p.data.email, p_notes: p.data.notes,
  });
  if (error || !data?.id) return { error: mensaje(error, "No se pudo guardar el apoderado. Vuelve a intentarlo."), values: valores(form) };
  revalidatePath("/apoderados");
  redirect(`/apoderados/${data.id}`);
}

export async function editarApoderado(_: Estado, form: FormData): Promise<Estado> {
  const { supabase } = await requireAdminAction();
  const id = idSchema.safeParse(form.get("guardianId"));
  const p = campos(form);
  if (!id.success) return { error: "Apoderado inválido." };
  if (!p.success) return { error: p.error.issues[0].message, values: valores(form) };
  const { error } = await supabase.rpc("update_guardian", {
    p_guardian_id: id.data, p_full_name: p.data.fullName, p_phone: p.data.phone, p_dni: p.data.dni, p_email: p.data.email, p_notes: p.data.notes,
  });
  if (error) return { error: mensaje(error, "No se pudo guardar los cambios. Vuelve a intentarlo."), values: valores(form) };
  revalidatePath("/apoderados");
  revalidatePath(`/apoderados/${id.data}`);
  return { ok: true };
}

// Desactivar corta el acceso a los hijos (políticas del móvil) y, si tiene cuenta, bloquea el login. Son dos pasos
// en sistemas distintos (base de datos y Auth), así que si el segundo falla se deshace el primero: nunca queda a medias
// sin avisar. La Edge Function no hace nada (ni audita) si la cuenta ya está en el estado pedido.
type Cliente = Awaited<ReturnType<typeof requireAdminAction>>["supabase"];
const tieneCuenta = async (supabase: Cliente, id: string) =>
  !!(await supabase.from("bus_guardians").select("auth_user_id").eq("id", id).maybeSingle()).data?.auth_user_id;

export async function desactivar(_: Estado, form: FormData): Promise<Estado> {
  const { supabase } = await requireAdminAction();
  const id = idSchema.safeParse(form.get("guardianId"));
  if (!id.success) return { error: "Apoderado inválido." };
  // En paralelo: cambiar el estado y saber si hay cuenta que bloquear.
  const [{ error }, cuenta] = await Promise.all([
    supabase.rpc("set_guardian_active", { p_guardian_id: id.data, p_active: false }),
    tieneCuenta(supabase, id.data),
  ]);
  if (error) return { error: mensaje(error, "No se pudo desactivar. Vuelve a intentarlo.") };
  if (cuenta) {
    const r = await guardianAccount(supabase, "deactivate", id.data);
    if (!r.ok) {
      const { error: undo } = await supabase.rpc("set_guardian_active", { p_guardian_id: id.data, p_active: true });
      revalidatePath(`/apoderados/${id.data}`);
      return { error: undo ? `No se pudo bloquear su cuenta (${r.error}) y el apoderado quedó desactivado: reactívalo o vuelve a intentarlo.` : `No se pudo bloquear su cuenta: ${r.error} No se cambió nada.` };
    }
  }
  revalidatePath("/apoderados");
  revalidatePath(`/apoderados/${id.data}`);
  return { ok: true };
}

export async function reactivar(_: Estado, form: FormData): Promise<Estado> {
  const { supabase } = await requireAdminAction();
  const id = idSchema.safeParse(form.get("guardianId"));
  if (!id.success) return { error: "Apoderado inválido." };
  const cuenta = await tieneCuenta(supabase, id.data);
  if (cuenta) {
    const r = await guardianAccount(supabase, "reactivate", id.data);
    if (!r.ok) return { error: r.error };
  }
  const { error } = await supabase.rpc("set_guardian_active", { p_guardian_id: id.data, p_active: true });
  if (error) {
    // La cuenta ya se había desbloqueado: se vuelve a bloquear para que coincida con el apoderado, que sigue desactivado.
    const undo = cuenta ? await guardianAccount(supabase, "deactivate", id.data) : { ok: true as const };
    revalidatePath(`/apoderados/${id.data}`);
    return { error: undo.ok ? mensaje(error, "No se pudo reactivar. No se cambió nada.") : "No se pudo reactivar y la cuenta quedó desbloqueada: vuelve a intentarlo." };
  }
  revalidatePath("/apoderados");
  revalidatePath(`/apoderados/${id.data}`);
  return { ok: true };
}

// Bloquear o desbloquear solo la cuenta (el apoderado sigue activo).
async function cuentaSolo(form: FormData, action: "deactivate" | "reactivate"): Promise<Estado> {
  const { supabase } = await requireAdminAction();
  const id = idSchema.safeParse(form.get("guardianId"));
  if (!id.success) return { error: "Apoderado inválido." };
  const r = await guardianAccount(supabase, action, id.data);
  if (!r.ok) return { error: r.error };
  revalidatePath(`/apoderados/${id.data}`);
  revalidatePath("/apoderados");
  return { ok: true };
}
export const bloquearCuenta = async (_: Estado, form: FormData) => cuentaSolo(form, "deactivate");
export const desbloquearCuenta = async (_: Estado, form: FormData) => cuentaSolo(form, "reactivate");

// Crear cuenta y reiniciar contraseña devuelven la contraseña temporal: la pantalla la muestra una sola vez.
async function conClave(guardianId: string, action: "create" | "reset_password"): Promise<Reveal> {
  const { supabase } = await requireAdminAction();
  const id = idSchema.safeParse(guardianId);
  if (!id.success) return { ok: false, error: "Apoderado inválido." };
  const r = await guardianAccount(supabase, action, id.data);
  if (!r.ok || !r.temporary_password || !r.email) return { ok: false, error: r.ok ? "No se pudo completar la acción de la cuenta." : r.error };
  revalidatePath(`/apoderados/${id.data}`);
  revalidatePath("/apoderados");
  return { ok: true, email: r.email, password: r.temporary_password };
}
export const crearCuenta = async (guardianId: string) => conClave(guardianId, "create");
export const reiniciarClave = async (guardianId: string) => conClave(guardianId, "reset_password");

// Solo lee: usa la comprobación liviana (una ida a la base menos por cada búsqueda mientras se escribe).
export async function buscarAlumnos(q: string): Promise<AlumnoOpcion[]> {
  const { supabase } = await requireAdmin();
  const term = String(q ?? "").trim().slice(0, 100);
  if (term.length < 2) return [];
  const { data } = await supabase.rpc("admin_list_students", { p_q: term, p_limit: 6, p_offset: 0 });
  return ((data ?? []) as { student_id: string; nombre: string; codigo: string | null; estado: string }[]).map((r) => ({ id: r.student_id, nombre: r.nombre, codigo: r.codigo, estado: r.estado }));
}

export async function vincular(_: Estado, form: FormData): Promise<Estado> {
  const { supabase } = await requireAdminAction();
  const p = vincularSchema.safeParse({
    studentId: form.get("studentId"), guardianId: form.get("guardianId"), relationship: form.get("relationship"), primary: form.get("primary") === "on",
  });
  if (!p.success) return { error: form.get("studentId") ? "Revisa los datos del vínculo." : "Elige un alumno de la lista." };
  const { error } = await supabase.rpc("link_guardian", { p_student_id: p.data.studentId, p_guardian_id: p.data.guardianId, p_relationship: p.data.relationship, p_is_primary: p.data.primary });
  if (error) return { error: mensaje(error, "No se pudo vincular. Vuelve a intentarlo.") };
  revalidatePath(`/apoderados/${p.data.guardianId}`);
  revalidatePath("/apoderados");
  revalidatePath(`/alumnos/${p.data.studentId}`);
  return { ok: true };
}

async function vinculo(form: FormData, rpc: "set_primary_guardian" | "unlink_guardian"): Promise<Estado> {
  const { supabase } = await requireAdminAction();
  const p = vinculoSchema.safeParse({ studentId: form.get("studentId"), guardianId: form.get("guardianId") });
  if (!p.success) return { error: "Vínculo inválido." };
  const { error } = await supabase.rpc(rpc, { p_student_id: p.data.studentId, p_guardian_id: p.data.guardianId });
  if (error) return { error: mensaje(error, "No se pudo completar la acción. Vuelve a intentarlo.") };
  revalidatePath(`/apoderados/${p.data.guardianId}`);
  revalidatePath("/apoderados");
  revalidatePath(`/alumnos/${p.data.studentId}`);
  return { ok: true };
}
export const marcarPrincipal = async (_: Estado, form: FormData) => vinculo(form, "set_primary_guardian");
export const desvincular = async (_: Estado, form: FormData) => vinculo(form, "unlink_guardian");
