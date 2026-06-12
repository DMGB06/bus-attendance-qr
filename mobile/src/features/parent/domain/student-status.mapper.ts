import { formatTurnTypeLabel } from "@/src/features/trips/domain/trip-labels";
import type { AttendanceEventType, TripDirection, TurnType } from "@/src/features/trips/types";

import type {
  ParentStatusPresentation,
  ParentStatusTone,
  StudentTripStatusValue,
} from "@/src/features/parent/types";

function toneForStatus(status: StudentTripStatusValue): ParentStatusTone {
  switch (status) {
    case "absent":
      return "absent";
    case "onboard":
    case "returning":
      return "onboard";
    case "at_school":
    case "dropped_off":
      return "completed";
    case "pending":
    default:
      return "pending";
  }
}

export function mapStudentTripStatusToPresentation(
  status: StudentTripStatusValue | null | undefined,
  direction: TripDirection | null | undefined,
): ParentStatusPresentation {
  const resolvedDirection = direction ?? "recojo";

  if (!status || status === "pending") {
    return {
      label: resolvedDirection === "recojo" ? "Esperando recojo" : "Esperando retorno",
      subtitle: "Aún no hay registro en el bus hoy",
      tone: "pending",
      icon: "clock-outline",
    };
  }

  if (status === "absent") {
    return {
      label: "Ausente hoy",
      subtitle: "El bus registró que no asistió",
      tone: "absent",
      icon: "account-off-outline",
    };
  }

  if (status === "onboard" && resolvedDirection === "recojo") {
    return {
      label: "Subió al bus",
      subtitle: "Camino al colegio",
      tone: "onboard",
      icon: "bus-side",
    };
  }

  if (status === "at_school") {
    return {
      label: "Llegó al colegio",
      subtitle: "Recojo completado",
      tone: "completed",
      icon: "school-outline",
    };
  }

  if (status === "returning") {
    return {
      label: "Subió al bus",
      subtitle: "Retorno a casa en curso",
      tone: "onboard",
      icon: "bus-side",
    };
  }

  if (status === "dropped_off") {
    return {
      label: "Llegó a casa",
      subtitle: "Retorno completado",
      tone: "completed",
      icon: "home-outline",
    };
  }

  return {
    label: "En recorrido",
    subtitle: "Estado actualizado",
    tone: toneForStatus(status),
    icon: "bus-marker",
  };
}

export function mapTimelineEventLabel(
  eventType: AttendanceEventType,
  direction: TripDirection,
  turnType: TurnType | null,
): string {
  const segment = turnType ? formatTurnTypeLabel(turnType) : direction === "recojo" ? "Recojo" : "Retorno";

  switch (eventType) {
    case "subio":
      return direction === "recojo" ? `Subió al bus (${segment})` : `Subió al bus — ${segment}`;
    case "bajo":
      return direction === "recojo" ? "Llegó al colegio" : "Llegó a casa";
    case "ausente":
      return "Marcado ausente";
    case "manual":
      return "Registro manual en bus";
    default:
      return "Evento registrado";
  }
}

export function formatLastUpdatedAt(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
