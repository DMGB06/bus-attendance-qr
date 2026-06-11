import type { Trip, TripDirection, TurnType } from "@/src/features/trips/types";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";

export function formatTripDirectionLabel(direction: TripDirection): string {
  return direction === "recojo" ? "Recojo" : "Retorno";
}

export function formatTurnTypeLabel(turnType: TurnType | null | undefined): string {
  switch (turnType) {
    case "mañana":
      return "Recojo mañana";
    case "tarde_primaria":
      return "Tarde primaria";
    case "tarde_secundaria":
      return "Tarde secundaria";
    case "tarde_unica":
      return "Tarde única";
    case "tarde":
      return "Tarde";
    default:
      return "Tramo";
  }
}

export function formatTripTitle(trip: Pick<Trip, "direction" | "turn_type">): string {
  if (trip.turn_type) {
    return formatTurnTypeLabel(trip.turn_type);
  }
  return `Viaje ${formatTripDirectionLabel(trip.direction)}`;
}

/** Etiqueta del destino al registrar `bajo` según el tramo. */
export function getDropoffLabel(direction: TripDirection): string {
  return direction === "recojo" ? "En colegio" : "En casa";
}

export function getDropoffActionLabel(direction: TripDirection): string {
  return direction === "recojo" ? "Marcar en colegio" : "Marcar en casa";
}

export function getRosterStatusLabel(
  item: Pick<TripRosterItem, "status" | "attendance">,
  direction: TripDirection,
): string {
  if (item.status === "pending") {
    return "Pendiente";
  }
  if (item.attendance?.event_type === "ausente") {
    return "Ausente";
  }
  if (item.status === "completed") {
    return getDropoffLabel(direction);
  }
  if (item.attendance?.event_type === "manual") {
    return "Manual";
  }
  return "A bordo";
}

export function getTripSegmentSubtitle(trip: Pick<Trip, "direction" | "turn_type">): string {
  switch (trip.turn_type) {
    case "mañana":
      return "Casas y paradas → colegio";
    case "tarde_primaria":
      return "Colegio primaria → casas";
    case "tarde_secundaria":
      return "Colegio secundaria → casas";
    case "tarde_unica":
      return "Colegio → casas";
    default:
      return trip.direction === "recojo" ? "Casas y paradas → colegio" : "Colegio → casas";
  }
}

export function getRosterScreenSubtitle(trip: Pick<Trip, "direction" | "turn_type">, studentCount: number): string {
  return `${formatTripTitle(trip)} · ${getTripSegmentSubtitle(trip)} · ${studentCount} alumnos`;
}

export function getCloseTripScreenSubtitle(direction: TripDirection): string {
  return direction === "recojo"
    ? "Confirma que todos los alumnos fueron dejados en el colegio antes de finalizar."
    : "Confirma que todos los alumnos bajaron en su casa antes de finalizar.";
}

export function getCloseTripValidationMessage(direction: TripDirection): string {
  return direction === "recojo"
    ? "Se verificará si quedan alumnos a bordo sin registro en colegio."
    : "Se verificará si quedan alumnos a bordo sin registro en casa.";
}

export function getDropoffConfirmTitle(direction: TripDirection): string {
  return `Confirmar ${getDropoffLabel(direction).toLowerCase()}`;
}

export function getDropoffConfirmMessage(studentName: string, direction: TripDirection): string {
  const action = direction === "recojo" ? "dejado en colegio" : "bajado en casa";
  return `¿Registrar que ${studentName} fue ${action}?`;
}

export function getCloseWithPendingTitle(direction: TripDirection): string {
  return direction === "recojo"
    ? "Hay alumnos sin dejar en colegio"
    : "Hay alumnos sin bajar en casa";
}

export function getCloseWithPendingMessage(
  students: { nombre_alumno: string; direccion: string | null }[],
  totalPending: number,
  direction: TripDirection,
): string {
  const dropoffPlace = direction === "recojo" ? "en colegio" : "en casa";
  const studentLines = formatCloseTripStudentLines(students, 6);
  const hasMoreStudents = totalPending > students.length;
  const overflowLine = hasMoreStudents
    ? `\n… y ${totalPending - students.length} alumno(s) más.`
    : "";

  return [
    `Aún hay ${totalPending} alumno(s) a bordo sin registro ${dropoffPlace}.`,
    "",
    studentLines,
    overflowLine,
    "",
    "Revisa la lista antes de cerrar. ¿Deseas finalizar el viaje de todas formas?",
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatCloseTripStudentLine(student: {
  nombre_alumno: string;
  direccion: string | null;
}): string {
  const stop = student.direccion?.trim() || "Sin parada registrada";
  return `${student.nombre_alumno} — ${stop}`;
}

export function formatCloseTripStudentLines(
  students: { nombre_alumno: string; direccion: string | null }[],
  maxShown = 8,
): string {
  return students
    .slice(0, maxShown)
    .map((student) => `• ${formatCloseTripStudentLine(student)}`)
    .join("\n");
}

export function getCloseTripOnboardSectionTitle(direction: TripDirection, count: number): string {
  const place = direction === "recojo" ? "colegio" : "casa";
  return count === 1
    ? `1 alumno a bordo sin registro en ${place}`
    : `${count} alumnos a bordo sin registro en ${place}`;
}

export function getCloseTripPrioritariosSectionTitle(count: number): string {
  return count === 1
    ? "1 prioritario sin escanear al subir"
    : `${count} prioritarios sin escanear al subir`;
}

export function getCloseTripReadyMessage(direction: TripDirection): string {
  return direction === "recojo"
    ? "No hay alumnos pendientes de registro en colegio."
    : "No hay alumnos pendientes de registro en casa.";
}

export function getDropoffRegisteredMessage(direction: TripDirection): string {
  return `${getDropoffLabel(direction)} registrado correctamente.`;
}

export function getDropoffQueuedMessage(direction: TripDirection): string {
  return `${getDropoffLabel(direction)} guardado localmente. Se sincronizará al recuperar señal.`;
}

export function getMorningHintLabel(isMorningRider: boolean): string {
  return isMorningRider ? "Vino en la mañana" : "Sin registro mañana";
}

export function getSuggestedLevelFilterHint(turnType: TurnType | null | undefined): string | null {
  if (turnType === "tarde_primaria") {
    return "Sugerencia: primaria (+ sin nivel).";
  }
  if (turnType === "tarde_secundaria") {
    return "Sugerencia: secundaria (+ sin nivel).";
  }
  return null;
}
