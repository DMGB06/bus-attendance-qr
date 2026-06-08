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

export async function findStudentInCache(lookup: string): Promise<Student | null> {
  const cached = await loadCachedStudents();
  if (!cached?.students.length) {
    return null;
  }

  const normalized = normalizeLookup(lookup);
  if (!normalized) {
    return null;
  }

  const byCode = matchStudentByCode(cached.students, normalized);
  if (byCode) {
    return byCode;
  }

  if (UUID_REGEX.test(normalized)) {
    return cached.students.find((student) => student.id === normalized) ?? null;
  }

  return null;
}

export async function searchStudentsInCache(name: string, limit = 8): Promise<Student[]> {
  const cached = await loadCachedStudents();
  if (!cached?.students.length) {
    return [];
  }

  const normalized = normalizeLookup(name).toLowerCase();
  if (!normalized) {
    return [];
  }

  return cached.students
    .filter((student) => student.nombre_alumno.toLowerCase().includes(normalized))
    .sort((a, b) => a.nombre_alumno.localeCompare(b.nombre_alumno, "es"))
    .slice(0, limit);
}
