"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/auth";
import { altaSchema, bajaSchema } from "@/lib/schemas/alumnos";

export type AccionEstado = { error?: string; ok?: true } | undefined;

// Cada acción vuelve a verificar al administrador; la base de datos lo verifica otra vez.
export async function darDeBaja(_: AccionEstado, form: FormData): Promise<AccionEstado> {
  const { supabase } = await requireAdminAction();
  const parsed = bajaSchema.safeParse({ studentId: form.get("studentId"), motivo: form.get("motivo") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase.rpc("deactivate_beneficiary", { p_student_id: parsed.data.studentId, p_reason: parsed.data.motivo });
  if (error) return { error: "No se pudo dar de baja. Vuelve a intentarlo." };
  revalidatePath("/alumnos");
  revalidatePath(`/alumnos/${parsed.data.studentId}`);
  return { ok: true };
}

// Alta nueva o reactivación: la misma función de la base de datos hace las dos.
export async function darDeAlta(_: AccionEstado, form: FormData): Promise<AccionEstado> {
  const { supabase } = await requireAdminAction();
  const parsed = altaSchema.safeParse({ studentId: form.get("studentId") });
  if (!parsed.success) return { error: "Alumno inválido." };

  const { error } = await supabase.rpc("enroll_beneficiary", { p_student_id: parsed.data.studentId });
  if (error) return { error: "No se pudo dar de alta. Vuelve a intentarlo." };
  revalidatePath("/alumnos");
  revalidatePath(`/alumnos/${parsed.data.studentId}`);
  return { ok: true };
}
