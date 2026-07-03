import type { AfternoonTurnType } from "@/src/features/trips/domain/trip-turn";
import type { TurnType } from "@/src/features/trips/types";

/** Tramos posibles en un día operativo (referencia para sugerencias). */
export const DAILY_TURN_TYPES: TurnType[] = [
  "mañana",
  "tarde_primaria",
  "tarde_secundaria",
  "tarde_unica",
];

export function isTurnCompletedToday(completedTurns: TurnType[], turnType: TurnType): boolean {
  return completedTurns.includes(turnType);
}

/** Sugiere mañana o tarde según lo ya cerrado hoy (sin bloquear). */
export function getDefaultTripPeriod(completedTurns: TurnType[]): "mañana" | "tarde" {
  return isTurnCompletedToday(completedTurns, "mañana") ? "tarde" : "mañana";
}

/** Sugiere el siguiente tramo tarde habitual (sin bloquear). */
export function getDefaultAfternoonTurn(completedTurns: TurnType[]): AfternoonTurnType {
  if (!isTurnCompletedToday(completedTurns, "tarde_primaria")) {
    return "tarde_primaria";
  }
  if (!isTurnCompletedToday(completedTurns, "tarde_secundaria")) {
    return "tarde_secundaria";
  }
  if (!isTurnCompletedToday(completedTurns, "tarde_unica")) {
    return "tarde_unica";
  }
  return "tarde_primaria";
}

/**
 * Texto informativo — nunca impide iniciar viaje.
 * Guía al chofer: mañana → tarde, sin reglas estrictas de “una sola vez”.
 */
export function getTurnStartSuggestion(
  completedTurns: TurnType[],
  selectedTurnType: TurnType,
): string | null {
  if (
    selectedTurnType !== "mañana" &&
    !isTurnCompletedToday(completedTurns, "mañana") &&
    completedTurns.length === 0
  ) {
    return "Sugerencia: lo habitual es iniciar mañana (recojo) y luego tarde (retorno).";
  }

  if (isTurnCompletedToday(completedTurns, selectedTurnType)) {
    switch (selectedTurnType) {
      case "mañana":
        return "Sugerencia: ya cerraste mañana hoy. Lo usual es continuar con tarde.";
      case "tarde_primaria":
        return "Sugerencia: ya cerraste tarde primaria. Puedes elegir otro tramo tarde si aplica.";
      case "tarde_secundaria":
        return "Sugerencia: ya cerraste tarde secundaria. Puedes elegir otro tramo tarde si aplica.";
      case "tarde_unica":
        return "Sugerencia: ya cerraste el viaje único de tarde hoy.";
      default:
        return "Sugerencia: ya cerraste este tramo hoy.";
    }
  }

  if (
    selectedTurnType === "mañana" &&
    isTurnCompletedToday(completedTurns, "mañana") === false &&
    completedTurns.some((turn) => turn.startsWith("tarde"))
  ) {
    return "Sugerencia: ya hiciste tarde hoy; mañana es opcional si coordinación lo pide.";
  }

  return null;
}

/** @deprecated Solo tests — la app ya no bloquea por turno completado. */
export function shouldBlockTurnStart(_completedTurns: TurnType[], _turnType: TurnType): boolean {
  return false;
}
