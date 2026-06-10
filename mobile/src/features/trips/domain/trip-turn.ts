import type { TripDirection, TurnType } from "@/src/features/trips/types";

export const AFTERNOON_TURN_OPTIONS = [
  { id: "tarde_primaria" as const, label: "Primaria", hint: "1.ª vuelta tarde" },
  { id: "tarde_secundaria" as const, label: "Secundaria", hint: "2.ª vuelta tarde" },
  { id: "tarde_unica" as const, label: "Única", hint: "Un solo viaje tarde" },
];

export type AfternoonTurnType = (typeof AFTERNOON_TURN_OPTIONS)[number]["id"];

export function getDirectionForTurnType(turnType: TurnType): TripDirection {
  return turnType === "mañana" ? "recojo" : "retorno";
}

export function isMorningTurn(turnType: TurnType): boolean {
  return turnType === "mañana";
}
