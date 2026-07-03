import { supabase, supabasePublic } from "@/src/core/config/supabase";
import { STUDENT_PADRON_SELECT } from "@/src/features/trips/domain/padron-query.constants";
import { escapeIlikePattern, sanitizeIlikeSearchTerm } from "@/src/shared/utils/ilike";
import { perfAsync } from "@/src/shared/utils/perfMark";
import { filterValidUuids, isUuid } from "@/src/shared/utils/uuid";
import {
  findStudentInCache,
  findStudentInStudentList,
  searchStudentsInCache,
  searchStudentsInStudentList,
} from "@/src/features/trips/services/students-cache.service";
import type { Student } from "@/src/features/trips/types";

function normalizeLookup(value: string) {
  return value.trim();
}

export async function findStudentByCode(code: string): Promise<Student | null> {
  const normalizedCode = normalizeLookup(code);
  if (!normalizedCode) {
    return null;
  }

  const { data, error } = await supabasePublic
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
    const { data: upperData, error: upperError } = await supabasePublic
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

function mergeGuardianFields(stale: Student, fresh: Partial<Student>): Student {
  return {
    ...stale,
    nombre_apoderado: stale.nombre_apoderado?.trim() || fresh.nombre_apoderado || null,
    telefono_apoderado: stale.telefono_apoderado?.trim() || fresh.telefono_apoderado || null,
    dni_apoderado: stale.dni_apoderado?.trim() || fresh.dni_apoderado || null,
  };
}

function hasGuardianInfo(student: Student): boolean {
  return Boolean(student.nombre_apoderado?.trim() || student.telefono_apoderado?.trim());
}

type CatalogGuardianRow = {
  is_primary: boolean;
  bus_guardians: {
    full_name: string;
    phone: string | null;
    dni: string | null;
    is_active: boolean;
  } | null;
};

const guardianCatalogCache = new Map<
  string,
  Pick<Student, "nombre_apoderado" | "telefono_apoderado" | "dni_apoderado"> | null
>();

/** Catálogo CerroBus (bus_guardians) cuando SIGEM no trae apoderado en el padrón. */
async function getGuardianFromCatalog(
  studentId: string,
): Promise<Pick<Student, "nombre_apoderado" | "telefono_apoderado" | "dni_apoderado"> | null> {
  if (guardianCatalogCache.has(studentId)) {
    return guardianCatalogCache.get(studentId) ?? null;
  }

  const { data, error } = await supabase
    .from("bus_student_guardians")
    .select("is_primary, bus_guardians(full_name, phone, dni, is_active)")
    .eq("student_id", studentId)
    .order("is_primary", { ascending: false });

  if (error || !data?.length) {
    guardianCatalogCache.set(studentId, null);
    return null;
  }

  const rows = data as CatalogGuardianRow[];
  const link =
    rows.find((row) => row.bus_guardians?.is_active !== false && row.bus_guardians) ?? rows[0];
  const guardian = link.bus_guardians;

  if (!guardian) {
    guardianCatalogCache.set(studentId, null);
    return null;
  }

  const nombre = guardian.full_name?.trim();
  const telefono = guardian.phone?.trim();
  const dni = guardian.dni?.trim();

  if (!nombre && !telefono) {
    guardianCatalogCache.set(studentId, null);
    return null;
  }

  const fields = {
    nombre_apoderado: nombre ?? null,
    telefono_apoderado: telefono ?? null,
    dni_apoderado: dni ?? null,
  };
  guardianCatalogCache.set(studentId, fields);
  return fields;
}

/** Roster/caché a veces trae alumno sin apoderado; completa catálogo CerroBus (SIGEM suele venir vacío). */
export async function refreshStudentGuardianFromPadron(student: Student): Promise<Student> {
  if (hasGuardianInfo(student)) {
    return student;
  }

  if (!student.id) {
    return student;
  }

  const fromCatalog = await getGuardianFromCatalog(student.id);
  if (fromCatalog) {
    return mergeGuardianFields(student, fromCatalog);
  }

  const fresh = student.codigo?.trim()
    ? await findStudentByCode(student.codigo)
    : await getStudentById(student.id);

  return fresh ? mergeGuardianFields(student, fresh) : student;
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
          return refreshStudentGuardianFromPadron(localMatch);
        }
      }

      const byCode = await findStudentByCode(normalized);
      if (byCode) {
        return refreshStudentGuardianFromPadron(byCode);
      }

      if (isUuid(normalized)) {
        if (localStudents?.length) {
          const localById = findStudentInStudentList(localStudents, normalized);
          if (localById) {
            return refreshStudentGuardianFromPadron(localById);
          }
        }
        const byUuid = await getStudentById(normalized);
        return byUuid ? refreshStudentGuardianFromPadron(byUuid) : null;
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
  const normalizedName = sanitizeIlikeSearchTerm(name);
  if (!normalizedName) {
    return [];
  }

  if (localStudents?.length) {
    const localResults = searchStudentsInStudentList(localStudents, normalizedName, limit);
    if (localResults.length) {
      return localResults;
    }
  }

  const cachedResults = await searchStudentsInCache(normalizedName, limit);
  if (cachedResults.length) {
    return cachedResults;
  }

  const escapedName = escapeIlikePattern(normalizedName);
  const { data, error } = await supabasePublic
    .from("social_bus_escolar")
    .select(STUDENT_PADRON_SELECT)
    .eq("activo", true)
    .ilike("nombre_alumno", `%${escapedName}%`)
    .order("nombre_alumno", { ascending: true })
    .limit(limit);

  if (error) {
    return searchStudentsInCache(normalizedName, limit);
  }

  return data ?? [];
}

export async function getStudentById(id: string): Promise<Student | null> {
  const normalizedId = normalizeLookup(id);
  if (!normalizedId || !isUuid(normalizedId)) {
    return null;
  }

  const { data, error } = await supabasePublic
    .from("social_bus_escolar")
    .select("*")
    .eq("id", normalizedId)
    .maybeSingle();

  if (error) {
    return findStudentInCache(normalizedId);
  }

  return data;
}

export async function getStudentsByIds(ids: string[]): Promise<Student[]> {
  const normalizedIds = filterValidUuids(ids);

  if (!normalizedIds.length) {
    return [];
  }

  const { data, error } = await supabasePublic
    .from("social_bus_escolar")
    .select("*")
    .in("id", normalizedIds);

  if (error) {
    throw new Error("No se pudo consultar la base de alumnos.");
  }

  return data ?? [];
}
