import { mapTimelineEventLabel } from "@/src/features/parent/domain/student-status.mapper";
import type { AttendanceEventType, TripDirection, TurnType } from "@/src/features/trips/types";

export function mapActivityEventLabel(
  eventType: AttendanceEventType,
  direction: TripDirection,
  turnType: TurnType | null,
): string {
  return mapTimelineEventLabel(eventType, direction, turnType);
}
