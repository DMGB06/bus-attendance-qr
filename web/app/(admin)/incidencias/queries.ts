import "server-only";
import type { requireAdmin } from "@/lib/auth";
import type { FilaIncidencia, FiltrosIncidencias } from "@/lib/schemas/incidencias";
import { PAGE_SIZE } from "@/lib/schemas/viajes";

type Cliente = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

export async function listarIncidencias(supabase: Cliente, filtros: FiltrosIncidencias) {
  const { data, error } = await supabase.rpc("admin_list_incidents", {
    p_desde: filtros.desde || null,
    p_hasta: filtros.hasta || null,
    p_bus_id: filtros.bus || null,
    p_turno: filtros.turno || null,
    p_tipo: filtros.tipo || null,
    p_limit: PAGE_SIZE,
    p_offset: (filtros.page - 1) * PAGE_SIZE,
  });
  return error ? null : data as { filas: FilaIncidencia[]; total: number } | null;
}
