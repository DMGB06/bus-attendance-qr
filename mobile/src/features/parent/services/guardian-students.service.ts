import { supabase, supabasePublic } from "@/src/core/config/supabase";
import type { Student } from "@/src/features/trips/types";
import { filterValidUuids } from "@/src/shared/utils/uuid";

/**
 * Alumnos del padrón visibles para el apoderado autenticado.
 * 1) RPC SECURITY DEFINER (recomendado tras migración 016)
 * 2) SELECT con RLS guardian_read_linked_padron (014)
 * 3) SELECT por IDs (legacy)
 */
export async function getGuardianPadronStudents(
  linkedStudentIds: string[],
): Promise<Student[]> {
  const validIds = filterValidUuids(linkedStudentIds);
  const idSet = new Set(validIds);

  const rpcResult = await supabase.rpc("get_my_guardian_students");
  if (!rpcResult.error && rpcResult.data?.length) {
    const rows = rpcResult.data as Student[];
    if (!validIds.length) {
      return rows;
    }
    const matched = rows.filter((row) => idSet.has(row.id));
    return matched.length > 0 ? matched : rows;
  }

  const scopedResult = await supabasePublic.from("social_bus_escolar").select("*");
  if (!scopedResult.error && scopedResult.data?.length) {
    const rows = scopedResult.data as Student[];
    if (!validIds.length) {
      return rows;
    }
    const matched = rows.filter((row) => idSet.has(row.id));
    if (matched.length > 0) {
      return matched;
    }
    return rows;
  }

  if (!validIds.length) {
    return [];
  }

  const byIdsResult = await supabasePublic
    .from("social_bus_escolar")
    .select("*")
    .in("id", validIds);

  if (byIdsResult.error) {
    throw new Error("No se pudo consultar la base de alumnos.");
  }

  return (byIdsResult.data ?? []) as Student[];
}
