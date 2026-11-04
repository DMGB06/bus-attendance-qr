import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";

export function isMorningRider(studentId: string, morningRiderIds: Set<string>): boolean {
  return morningRiderIds.has(studentId);
}

export function isPrioritaryStudent(
  item: TripRosterItem,
  morningRiderIds: Set<string>,
): boolean {
  return isMorningRider(item.student.id, morningRiderIds) && item.status === "pending";
}

export function getPrioritaryStudents(
  items: TripRosterItem[],
  morningRiderIds: Set<string>,
): TripRosterItem[] {
  return items.filter((item) => isPrioritaryStudent(item, morningRiderIds));
}
