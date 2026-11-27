import "server-only";
import type { requireAdmin } from "@/lib/auth";
import type { FiltrosAsistencia, HistorialAsistencia } from "@/lib/schemas/asistencia";
import { PAGE_SIZE } from "@/lib/schemas/viajes";

type Cliente = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

export async function obtenerAsistencia(supabase: Cliente, id: string, filtros: FiltrosAsistencia) {
  const { data, error } = await supabase.rpc("admin_student_attendance", {
    p_student_id: id,
    p_desde: filtros.desde || null,
    p_hasta: filtros.hasta || null,
    p_turno: filtros.turno ?? null,
    p_evento: filtros.evento ?? null,
    p_limit: PAGE_SIZE,
    p_offset: (filtros.page - 1) * PAGE_SIZE,
  });
  return error ? null : data as HistorialAsistencia | null;
}
