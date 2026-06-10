import { loadCachedStudents } from "@/src/features/trips/storage/roster-cache.storage";
import type { Student } from "@/src/features/trips/types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeLookup(value: string) {
  return value.trim();
}

function matchStudentByCode(students: Student[], code: string): Student | null {
  const normalized = normalizeLookup(code);
  if (!normalized) {
    return null;
  }

  const upper = normalized.toUpperCase();
  return (
    students.find((student) => student.codigo?.trim().toUpperCase() === upper) ??
    students.find((student) => student.codigo?.trim() === normalized) ??
    null
  );
}

/** Resuelve alumno por código o UUID en una lista en memoria (p. ej. roster hidratado). */
export function findStudentInStudentList(students: Student[], lookup: string): Student | null {
  const normalized = normalizeLookup(lookup);
  if (!normalized || !students.length) {
    return null;
  }

  const byCode = matchStudentByCode(students, normalized);
  if (byCode) {
    return byCode;
  }

  if (UUID_REGEX.test(normalized)) {
    return students.find((student) => student.id === normalized) ?? null;
  }

  return null;
}

/** Busca alumnos por nombre en una lista en memoria. */
export function searchStudentsInStudentList(
  students: Student[],
  name: string,
  limit = 8,
): Student[] {
  const normalized = normalizeLookup(name).toLowerCase();
  if (!normalized || !students.length) {
    return [];
  }

  return students
    .filter((student) => student.nombre_alumno.toLowerCase().includes(normalized))
    .sort((a, b) => a.nombre_alumno.localeCompare(b.nombre_alumno, "es"))
    .slice(0, limit);
}

export async function findStudentInCache(lookup: string): Promise<Student | null> {
  const cached = await loadCachedStudents();
  if (!cached?.students.length) {
    return null;
  }

  return findStudentInStudentList(cached.students, lookup);
}

export async function searchStudentsInCache(name: string, limit = 8): Promise<Student[]> {
  const cached = await loadCachedStudents();
  if (!cached?.students.length) {
    return [];
  }

  return searchStudentsInStudentList(cached.students, name, limit);
}
