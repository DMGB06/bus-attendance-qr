import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";
import type { AttendanceEventType, AttendanceRecord } from "@/src/features/trips/types";

function createPatchRecord(
  tripId: string,
  studentId: string,
  eventType: AttendanceEventType,
): AttendanceRecord {
  return {
    id: `patch-${Date.now()}`,
    trip_id: tripId,
    student_id: studentId,
    event_type: eventType,
    scanned_at: new Date().toISOString(),
    lat: null,
    lng: null,
    operator_id: null,
    is_offline_sync: true,
  };
}

export function patchRosterItemsForEvent(
  items: TripRosterItem[],
  tripId: string,
  studentId: string,
  eventType: AttendanceEventType,
): TripRosterItem[] {
  const record = createPatchRecord(tripId, studentId, eventType);

  return items.map((item) => {
    if (item.student.id !== studentId) {
      return item;
    }

    const status =
      eventType === "bajo" || eventType === "ausente"
        ? "completed"
        : "onboard";

    return {
      ...item,
      attendance: record,
      status,
      hasAttendance: true,
      canMarkManual: false,
      canMarkExit: status === "onboard",
    };
  });
}

export function patchRosterItemsForBulkDropoff(
  items: TripRosterItem[],
  tripId: string,
  studentIds: string[],
): TripRosterItem[] {
  return studentIds.reduce(
    (currentItems, studentId) =>
      patchRosterItemsForEvent(currentItems, tripId, studentId, "bajo"),
    items,
  );
}
