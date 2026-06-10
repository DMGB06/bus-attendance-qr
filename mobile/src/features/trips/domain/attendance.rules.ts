import type { AttendanceEventType, AttendanceRecord } from "@/src/features/trips/types";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";

const BOARDING_EVENTS: AttendanceEventType[] = ["subio", "manual"];

export function isBoardingEvent(eventType: AttendanceEventType): boolean {
  return BOARDING_EVENTS.includes(eventType);
}

export function hasBoardingInHistory(history: AttendanceRecord[]): boolean {
  return history.some((record) => isBoardingEvent(record.event_type));
}

export function hasDropoffInHistory(history: AttendanceRecord[]): boolean {
  return history.some((record) => record.event_type === "bajo");
}

export function hasEventInHistory(
  history: AttendanceRecord[],
  eventType: AttendanceEventType,
): boolean {
  return history.some((record) => record.event_type === eventType);
}

export function canRegisterBoarding(item: TripRosterItem | undefined): boolean {
  if (!item) {
    return true;
  }
  return item.status === "pending";
}

export function canRegisterDropoff(item: TripRosterItem | undefined): boolean {
  if (!item) {
    return false;
  }
  return item.status === "onboard";
}

export function canRegisterAbsent(item: TripRosterItem | undefined): boolean {
  if (!item) {
    return false;
  }
  return item.status === "pending";
}

export function getDuplicateRegistrationMessage(eventType: AttendanceEventType): string {
  if (eventType === "bajo") {
    return "La salida de este alumno ya fue registrada.";
  }
  if (isBoardingEvent(eventType)) {
    return "Ya registrado";
  }
  if (eventType === "ausente") {
    return "Este alumno ya fue marcado como ausente.";
  }
  return "Este evento ya fue registrado.";
}

export function findRosterItem(
  items: TripRosterItem[],
  studentId: string,
): TripRosterItem | undefined {
  return items.find((item) => item.student.id === studentId);
}
