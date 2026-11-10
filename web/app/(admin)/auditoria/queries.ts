import type { requireAdmin } from "@/lib/auth";
import { PAGE_SIZE, type FilaAuditoria, type Grupo } from "@/lib/schemas/auditoria";

type Cliente = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

// Solo lectura: la función de la base no escribe nada.
export async function listarAuditoria(supabase: Cliente, f: { desde?: string; hasta?: string; grupo?: Grupo; page: number }) {
  const { data, error } = await supabase.rpc("admin_list_audit", {
    p_desde: f.desde ?? null, p_hasta: f.hasta ?? null, p_grupo: f.grupo ?? null, p_limit: PAGE_SIZE, p_offset: (f.page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error("No se pudo cargar la auditoría.");
  const filas = (data ?? []) as FilaAuditoria[];
  return { filas, total: Number(filas[0]?.total ?? 0) };
}
