import type { StudentTripStatusValue } from "@/src/features/parent/types";
import type { AttendanceEventType, TripDirection } from "@/src/features/trips/types";

type AttendanceSlice = {
  event_type: AttendanceEventType | string;
  scanned_at: string;
  voided_at?: string | null;
};

function sortedActive(records: AttendanceSlice[]): AttendanceSlice[] {
  return records
    .filter((record) => !record.voided_at)
    .sort((left, right) => Date.parse(left.scanned_at) - Date.parse(right.scanned_at));
}

/** El estado lo define el ultimo evento vigente. */
export function deriveStudentTripStatusValue(
  records: AttendanceSlice[],
  direction: TripDirection,
): StudentTripStatusValue {
  const eventType = sortedActive(records).at(-1)?.event_type;

  if (eventType === "ausente") {
    return "absent";
  }
  if (eventType === "subio" || eventType === "manual") {
    return direction === "recojo" ? "onboard" : "returning";
  }
  if (eventType === "bajo") {
    return direction === "recojo" ? "at_school" : "dropped_off";
  }
  return "pending";
}

export function buildStudentTripStatusFromAttendance(
  studentId: string,
  tripId: string,
  tripDate: string,
  direction: TripDirection,
  records: AttendanceSlice[],
): {
  student_id: string;
  trip_id: string;
  trip_date: string;
  direction: TripDirection;
  status: StudentTripStatusValue;
  last_event_type: string | null;
  last_event_at: string | null;
  updated_at: string;
} {
  const last = sortedActive(records).at(-1);

  return {
    student_id: studentId,
    trip_id: tripId,
    trip_date: tripDate,
    direction,
    status: deriveStudentTripStatusValue(records, direction),
    last_event_type: last?.event_type ?? null,
    last_event_at: last?.scanned_at ?? null,
    updated_at: last?.scanned_at ?? new Date().toISOString(),
  };
}
