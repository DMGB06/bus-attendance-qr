import type { NivelEducativo, Student, TurnType } from "@/src/features/trips/types";

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
