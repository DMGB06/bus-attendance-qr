import type { NivelEducativo, Student, TurnType } from "@/src/features/trips/types";

const PRIMARIA_SCHOOL_MARKERS = ["OLAYA"];
const SECUNDARIA_SCHOOL_MARKERS = ["MEJIA", "MEJÍA", "SALOMON", "SALOMÓN", "SACO"];

const PRIMARIA_SCHOOL_DEFAULT = "JOSÉ OLAYA BALANDRA";
const SECUNDARIA_SCHOOL_DEFAULT = "GERARDO SALOMÓN MEJÍA SACO";

const PRIMARIA_MAX_AGE = 12;
const SECUNDARIA_MIN_AGE = 13;

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function inferNivelFromColegio(colegio: string | null | undefined): NivelEducativo | null {
  if (!colegio?.trim()) {
    return null;
  }

  const normalized = normalizeText(colegio);

  if (SECUNDARIA_SCHOOL_MARKERS.some((marker) => normalized.includes(normalizeText(marker)))) {
    return "secundaria";
  }

  if (PRIMARIA_SCHOOL_MARKERS.some((marker) => normalized.includes(normalizeText(marker)))) {
    return "primaria";
  }

  return null;
}

function inferNivelFromEdad(edad: number | null | undefined): NivelEducativo | null {
  if (edad == null || Number.isNaN(edad)) {
    return null;
  }

  if (edad <= PRIMARIA_MAX_AGE) {
    return "primaria";
  }

  if (edad >= SECUNDARIA_MIN_AGE) {
    return "secundaria";
  }

  return null;
}

/** Inferencia usada por el script SQL/Python y como respaldo en cliente. */
export function inferNivelEducativo(student: Pick<Student, "colegio" | "edad">): NivelEducativo | null {
  return inferNivelFromColegio(student.colegio) ?? inferNivelFromEdad(student.edad);
}

export function inferColegioFromNivel(nivel: NivelEducativo): string {
  return nivel === "primaria" ? PRIMARIA_SCHOOL_DEFAULT : SECUNDARIA_SCHOOL_DEFAULT;
}

export function getSuggestedNivelForTurn(turnType: TurnType | null | undefined): NivelEducativo | null {
  if (turnType === "tarde_primaria") {
    return "primaria";
  }
  if (turnType === "tarde_secundaria") {
    return "secundaria";
  }
  return null;
}

/** Incluye alumnos del nivel sugerido y los que aún no tienen nivel registrado. */
export function matchesSuggestedLevelFilter(
  student: Pick<Student, "nivel_educativo">,
  suggestedNivel: NivelEducativo,
): boolean {
  if (!student.nivel_educativo) {
    return true;
  }
  return student.nivel_educativo === suggestedNivel;
}

export function countStudentsWithNivelData(
  students: Pick<Student, "nivel_educativo">[],
): number {
  return students.filter((student) => student.nivel_educativo != null).length;
}

export function countSuggestedLevelMatches<T extends { student: Student }>(
  items: T[],
  suggestedNivel: NivelEducativo,
): number {
  return items.filter((item) => matchesSuggestedLevelFilter(item.student, suggestedNivel)).length;
}
