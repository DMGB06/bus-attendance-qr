import type { AfternoonTurnType } from "@/src/features/trips/domain/trip-turn";
import type { TurnType } from "@/src/features/trips/types";

export function getTurnStartBlockedMessage(turnType: TurnType): string {
  switch (turnType) {
    case "mañana":
      return "Ya registraste el recojo de mañana hoy. Inicia el viaje de tarde.";
    case "tarde_primaria":
      return "Ya completaste tarde primaria hoy.";
    case "tarde_secundaria":
      return "Ya completaste tarde secundaria hoy.";
    case "tarde_unica":
      return "Ya completaste el viaje único de tarde hoy.";
    case "tarde":
      return "Ya completaste este tramo de tarde hoy.";
    default:
      return "Ya completaste este tramo hoy.";
  }
}

export function isTurnCompletedToday(completedTurns: TurnType[], turnType: TurnType): boolean {
  return completedTurns.includes(turnType);
}

export function getDefaultTripPeriod(completedTurns: TurnType[]): "mañana" | "tarde" {
  return isTurnCompletedToday(completedTurns, "mañana") ? "tarde" : "mañana";
}

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
