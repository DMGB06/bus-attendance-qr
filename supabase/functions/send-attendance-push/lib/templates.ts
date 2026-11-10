import type { AttendanceEventType, PushEventKey, TripDirection } from "./types.ts";

export function resolvePushEventKey(
  eventType: AttendanceEventType,
  direction: TripDirection,
): PushEventKey | null {
  const isBoarding = eventType === "subio" || eventType === "manual";

  if (direction === "recojo" && isBoarding) return "recojo_subio";
  if (direction === "recojo" && eventType === "bajo") return "recojo_bajo";
  if (direction === "retorno" && isBoarding) return "retorno_subio";
  if (direction === "retorno" && eventType === "bajo") return "retorno_bajo";

  return null;
}

export function buildAttendancePushNotification(
  eventKey: PushEventKey,
  studentName: string,
): { event_key: PushEventKey; title: string; body: string } {
  switch (eventKey) {
    case "recojo_subio":
      return {
        event_key: eventKey,
        title: "CerroBus",
        body: `${studentName} subió al bus en el recojo.`,
      };
    case "recojo_bajo":
      return {
        event_key: eventKey,
        title: "CerroBus",
        body: `${studentName} llegó al colegio.`,
      };
    case "retorno_subio":
      return {
        event_key: eventKey,
        title: "CerroBus",
        body: `${studentName} subió al bus en el retorno.`,
      };
    case "retorno_bajo":
      return {
        event_key: eventKey,
        title: "CerroBus",
        body: `${studentName} llegó a casa.`,
      };
  }
}
