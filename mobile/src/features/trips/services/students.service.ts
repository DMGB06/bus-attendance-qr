import { supabase } from "@/src/core/config/supabase";
import { perfAsync } from "@/src/shared/utils/perfMark";
import {
  findStudentInCache,
  findStudentInStudentList,
  searchStudentsInCache,
  searchStudentsInStudentList,
} from "@/src/features/trips/services/students-cache.service";
import type { Student } from "@/src/features/trips/types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeLookup(value: string) {
  return value.trim();
}

function isUuid(value: string) {
  return UUID_REGEX.test(value);
}

export async function findStudentByCode(code: string): Promise<Student | null> {
  const normalizedCode = normalizeLookup(code);
  if (!normalizedCode) {
    return null;
  }

  const { data, error } = await supabase
    .from("social_bus_escolar")
    .select("*")
    .eq("codigo", normalizedCode)
    .maybeSingle();

  if (error) {
    const cached = await findStudentInCache(normalizedCode);
    if (cached) {
      return cached;
    }
    throw new Error("No se pudo consultar la base de alumnos.");
  }

  if (data) {
    return data;
  }

  const upperCode = normalizedCode.toUpperCase();
  if (upperCode !== normalizedCode) {
    const { data: upperData, error: upperError } = await supabase
      .from("social_bus_escolar")
      .select("*")
      .eq("codigo", upperCode)
      .maybeSingle();

    if (upperError) {
      const cached = await findStudentInCache(normalizedCode);
      if (cached) {
        return cached;
      }
      throw new Error("No se pudo consultar la base de alumnos.");
    }

    return upperData;
  }

  return findStudentInCache(normalizedCode);
}

/** Busca por código BU00xx o por UUID (QR legacy). Prioriza lista local si el roster está hidratado. */
export async function findStudentByLookup(
  value: string,
  localStudents?: Student[],
): Promise<Student | null> {
  return perfAsync(
    "findStudentByLookup",
    async () => {
      const normalized = normalizeLookup(value);
      if (!normalized) {
        return null;
      }

      if (localStudents?.length) {
        const localMatch = findStudentInStudentList(localStudents, normalized);
        if (localMatch) {
          return localMatch;
        }
      }

      const byCode = await findStudentByCode(normalized);
      if (byCode) {
        return byCode;
      }

      if (isUuid(normalized)) {
        if (localStudents?.length) {
          const localById = findStudentInStudentList(localStudents, normalized);
          if (localById) {
            return localById;
          }
        }
        return getStudentById(normalized);
      }

      return null;
    },
    { lookupLength: value.trim().length, localCount: localStudents?.length ?? 0 },
  );
}

export async function searchStudentsByName(
  name: string,
  limit = 8,
  localStudents?: Student[],
): Promise<Student[]> {
  const normalizedName = normalizeLookup(name);
  if (!normalizedName) {
    return [];
  }

  if (localStudents?.length) {
    const localResults = searchStudentsInStudentList(localStudents, normalizedName, limit);
    if (localResults.length) {
      return localResults;
    }
  }

  const { data, error } = await supabase
    .from("social_bus_escolar")
    .select("*")
    .ilike("nombre_alumno", `%${normalizedName}%`)
    .order("nombre_alumno", { ascending: true })
    .limit(limit);

  if (error) {
    return searchStudentsInCache(normalizedName, limit);
  }

  return data ?? [];
}

export async function getStudentById(id: string): Promise<Student | null> {
  const normalizedId = normalizeLookup(id);
  if (!normalizedId) {
    return null;
  }

  const { data, error } = await supabase
    .from("social_bus_escolar")
    .select("*")
    .eq("id", normalizedId)
    .maybeSingle();

  if (error) {
    return findStudentInCache(normalizedId);
  }

  return data;
}
