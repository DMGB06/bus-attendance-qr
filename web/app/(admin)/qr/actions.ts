"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/auth";
import { anioCarnet, estadoCarnet } from "@/lib/carnet/estado";
import type { Carnet } from "@/lib/carnet/layout";
import { formatoSchema, idSchema, idsSchema, motivoSchema } from "@/lib/schemas/carnets";

export type Resultado = { ok: true } | { ok: false; error: string };
export type Preparado = { ok: true; carnets: Carnet[]; emitidos: number } | { ok: false; error: string };

// Mensajes de la base de datos que se pueden mostrar tal cual (están en español y no traen detalles internos).
const CONOCIDOS = /^(El alumno no tiene código|Alumno no encontrado|El alumno no tiene un carnet vigente|Ya existe un carnet vigente|Debes indicar un motivo|Elige de 1 a 200)/;
const mensaje = (e: { message?: string } | null, general: string) => (e?.message && CONOCIDOS.test(e.message) ? e.message : general);

type Cliente = Awaited<ReturnType<typeof requireAdminAction>>["supabase"];

async function vigentes(supabase: Cliente, ids: string[]) {
  const { data, error } = await supabase.from("qr_codes").select("student_id, code, issued_at").in("student_id", ids).eq("status", "vigente");
  if (error) throw new Error("No se pudieron leer los carnets.");
  return new Map((data ?? []).map((r) => [r.student_id as string, r as { student_id: string; code: string; issued_at: string }]));
}

// Prepara los datos para imprimir. Con `emitir`, a quien no tiene carnet vigente de este año se le emite uno
// (mismo código; el anterior queda como reemplazado). Después deja la impresión en la auditoría.
// Sin `emitir` solo imprime lo que ya hay (vigente o vencido); si falta un carnet, avisa.
export async function prepararCarnets(idsEntrada: string[], emitir: boolean, formatoEntrada: string): Promise<Preparado> {
  const { supabase } = await requireAdminAction();
  const ids = idsSchema.safeParse([...new Set(idsEntrada)]);
  const formato = formatoSchema.safeParse(formatoEntrada);
  if (!ids.success) return { ok: false, error: ids.error.issues[0].message };
  if (!formato.success) return { ok: false, error: "Formato inválido." };

  const [padron, benef, actuales] = await Promise.all([
    supabase.schema("public").from("social_bus_escolar").select("id, codigo, nombre_alumno").in("id", ids.data),
    supabase.from("bus_beneficiaries").select("student_id").in("student_id", ids.data).eq("is_active", true),
    vigentes(supabase, ids.data),
  ]);
  if (padron.error || benef.error) return { ok: false, error: "No se pudieron leer los alumnos." };
  const alumno = new Map((padron.data ?? []).map((a) => [a.id as string, a as { id: string; codigo: string | null; nombre_alumno: string }]));
  const activos = new Set((benef.data ?? []).map((b) => b.student_id as string));
  if (alumno.size !== ids.data.length) return { ok: false, error: "Alumno no encontrado." };

  // Quién necesita emisión: sin vigente, o vigente de un año anterior.
  const faltan = ids.data.filter((id) => {
    const v = actuales.get(id);
    return !v || estadoCarnet({ status: "vigente", issued_at: v.issued_at }) !== "vigente";
  });
  if (faltan.length && !emitir) {
    const sin = faltan.filter((id) => !actuales.has(id));
    if (sin.length) return { ok: false, error: `${alumno.get(sin[0])!.nombre_alumno} no tiene carnet: emítelo primero.` };
  }
  if (emitir) {
    for (const id of faltan) {
      const a = alumno.get(id)!;
      if (!activos.has(id)) return { ok: false, error: `${a.nombre_alumno} no es beneficiario activo: no se le puede emitir carnet.` };
      if (!a.codigo?.trim()) return { ok: false, error: `${a.nombre_alumno} no tiene código en el padrón: no se le puede emitir carnet.` };
    }
  }

  // Una sola llamada y una sola transaccion: se emiten todos o ninguno (antes eran hasta 200 llamadas en fila).
  let emitidos = 0;
  if (emitir && faltan.length) {
    const { data, error } = await supabase.rpc("issue_qr_cards", { p_student_ids: faltan });
    if (error) return { ok: false, error: `${mensaje(error, "No se pudieron emitir los carnets.")} No se emitió ninguno.` };
    emitidos = Number(data ?? faltan.length);
  }

  const finales = emitidos ? await vigentes(supabase, ids.data) : actuales;
  const carnets: Carnet[] = ids.data.map((id) => {
    const v = finales.get(id)!;
    return { codigo: v.code, nombre: alumno.get(id)!.nombre_alumno, anio: anioCarnet(v.issued_at) };
  });

  const { error } = await supabase.rpc("log_qr_print", { p_student_ids: ids.data, p_format: formato.data });
  if (error) return { ok: false, error: "No se pudo registrar la impresión. No se descargó nada." };

  revalidatePath("/qr");
  revalidatePath("/qr/[id]", "page"); // una sola invalidación para todas las fichas (antes una por alumno, hasta 200)
  return { ok: true, carnets, emitidos };
}

export async function emitirCarnet(studentId: string): Promise<Resultado> {
  const { supabase } = await requireAdminAction();
  const id = idSchema.safeParse(studentId);
  if (!id.success) return { ok: false, error: "Alumno inválido." };
  const { data: b } = await supabase.from("bus_beneficiaries").select("is_active").eq("student_id", id.data).maybeSingle();
  if (!b?.is_active) return { ok: false, error: "Solo se emiten carnets a beneficiarios activos." };
  const { error } = await supabase.rpc("issue_qr_card", { p_student_id: id.data });
  if (error) return { ok: false, error: mensaje(error, "No se pudo emitir el carnet. Vuelve a intentarlo.") };
  revalidatePath("/qr");
  revalidatePath(`/qr/${id.data}`);
  return { ok: true };
}

export async function reportarPerdido(studentId: string, motivoEntrada: string): Promise<Resultado> {
  const { supabase } = await requireAdminAction();
  const id = idSchema.safeParse(studentId);
  const motivo = motivoSchema.safeParse(motivoEntrada);
  if (!id.success) return { ok: false, error: "Alumno inválido." };
  if (!motivo.success) return { ok: false, error: motivo.error.issues[0].message };
  const { error } = await supabase.rpc("report_qr_lost", { p_student_id: id.data, p_reason: motivo.data });
  if (error) return { ok: false, error: mensaje(error, "No se pudo reportar el carnet. Vuelve a intentarlo.") };
  revalidatePath("/qr");
  revalidatePath(`/qr/${id.data}`);
  return { ok: true };
}
