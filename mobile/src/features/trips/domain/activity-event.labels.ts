import { mapTimelineEventLabel } from "@/src/features/parent/domain/student-status.mapper";
import type { AttendanceEventType, TripDirection, TurnType } from "@/src/features/trips/types";

export function mapActivityEventLabel(
  eventType: AttendanceEventType,
  direction: TripDirection,
  turnType: TurnType | null,
): string {
  return mapTimelineEventLabel(eventType, direction, turnType);
}

/** Etiqueta corta para filas agrupadas por viaje (sin repetir turno/dirección). */
export function mapActivityEventLabelShort(
  eventType: AttendanceEventType,
  direction: TripDirection,
): string {
  switch (eventType) {
    case "subio":
      return "Subió al bus";
    case "bajo":
      return direction === "recojo" ? "Llegó al colegio" : "Llegó a casa";
    case "ausente":
      return "Marcado ausente";
    case "manual":
      return "Registro manual";
    default:
      return "Evento registrado";
  }
}

/** Texto compacto para el tag derecho de la fila. */
export function mapActivityEventTagLabel(
  eventType: AttendanceEventType,
  direction: TripDirection,
): string {
  switch (eventType) {
    case "subio":
      return "Subió";
    case "bajo":
      return direction === "recojo" ? "Colegio" : "Casa";
    case "ausente":
      return "Ausente";
    case "manual":
      return "Manual";
    default:
      return "Evento";
  }
}
