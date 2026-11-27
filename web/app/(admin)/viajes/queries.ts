import "server-only";
import type { requireAdmin } from "@/lib/auth";
import { PAGE_SIZE, type BusViaje, type DetalleViaje, type FilaViaje, type FiltrosViajes } from "@/lib/schemas/viajes";

type Cliente = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

export async function listarViajes(supabase: Cliente, f: FiltrosViajes) {
  const { data, error } = await supabase.rpc("admin_list_trips", {
    p_desde: f.desde || null, p_hasta: f.hasta || null, p_bus_id: f.bus ?? null,
    p_turno: f.turno ?? null, p_sentido: f.sentido ?? null, p_estado: f.estado ?? null,
    p_limit: PAGE_SIZE, p_offset: (f.page - 1) * PAGE_SIZE,
  });
  if (error || !data) throw new Error("No se pudieron cargar los viajes.");
  return data as { filas: FilaViaje[]; total: number };
}

export async function listarBuses(supabase: Cliente) {
  const { data, error } = await supabase.rpc("admin_list_trip_buses");
  if (error) throw new Error("No se pudieron cargar los buses.");
  return (data ?? []) as BusViaje[];
}

export async function obtenerViaje(supabase: Cliente, id: string, pagina: number) {
  const { data, error } = await supabase.rpc("admin_trip_detail", {
    p_trip_id: id, p_limit: PAGE_SIZE, p_offset: (pagina - 1) * PAGE_SIZE,
  });
  if (error) throw new Error("No se pudo cargar el viaje.");
  return data as DetalleViaje | null;
}
