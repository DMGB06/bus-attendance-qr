import type { AttendanceEventType, TripDirection } from "@/src/features/trips/types";

import type { PushEventKey } from "@/src/features/notifications/types";

export function resolvePushEventKey(
  eventType: AttendanceEventType,
  direction: TripDirection,
): PushEventKey | null {
  const isBoarding = eventType === "subio" || eventType === "manual";

  if (direction === "recojo" && isBoarding) {
    return "recojo_subio";
  }

  if (direction === "recojo" && eventType === "bajo") {
    return "recojo_bajo";
  }

  if (direction === "retorno" && isBoarding) {
    return "retorno_subio";
  }

  if (direction === "retorno" && eventType === "bajo") {
    return "retorno_bajo";
  }

  return null;
}

export function getPushEventLabel(eventKey: PushEventKey): string {
  switch (eventKey) {
    case "recojo_subio":
      return "Subió al bus (recojo)";
    case "recojo_bajo":
      return "Llegó al colegio";
    case "retorno_subio":
      return "Subió al bus (retorno)";
    case "retorno_bajo":
      return "Llegó a casa";
    default:
      return "Evento del bus";
  }
}

export function buildAttendancePushNotification(
  eventKey: PushEventKey,
  studentName: string,
): { event_key: PushEventKey; title: string; body: string } {
  switch (eventKey) {
    case "recojo_subio":
      return {
        event_key: eventKey,
        title: "Bus Escolar",
        body: `${studentName} subió al bus en el recojo.`,
      };
    case "recojo_bajo":
      return {
        event_key: eventKey,
        title: "Bus Escolar",
        body: `${studentName} llegó al colegio.`,
      };
    case "retorno_subio":
      return {
        event_key: eventKey,
        title: "Bus Escolar",
        body: `${studentName} subió al bus en el retorno.`,
      };
    case "retorno_bajo":
      return {
        event_key: eventKey,
        title: "Bus Escolar",
        body: `${studentName} llegó a casa.`,
      };
    default:
      return {
        event_key: eventKey,
        title: "Bus Escolar",
        body: `Actualización de ${studentName} en el bus.`,
      };
  }
}
