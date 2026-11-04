import { APP_TIME_ZONE } from "@/src/shared/utils/local-date";
import type { AfternoonTurnType } from "@/src/features/trips/domain/trip-turn";
import type { TurnType } from "@/src/features/trips/types";

export function isTurnCompletedToday(completedTurns: TurnType[], turnType: TurnType): boolean {
  return completedTurns.includes(turnType);
}

const AFTERNOON_START_HOUR = 12;

/** Sugiere mañana o tarde según lo ya cerrado hoy (sin bloquear). */
export function getDefaultTripPeriod(
  completedTurns: TurnType[],
  now: Date = new Date(),
): "mañana" | "tarde" {
  if (isTurnCompletedToday(completedTurns, "mañana")) {
    return "tarde";
  }
  const limaHour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: APP_TIME_ZONE,
    }).format(now),
  );
  return limaHour >= AFTERNOON_START_HOUR ? "tarde" : "mañana";
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
