import type { StudentTripStatusValue } from "@/src/features/parent/types";
import type { AttendanceEventType, TripDirection } from "@/src/features/trips/types";

type AttendanceSlice = {
  event_type: AttendanceEventType | string;
  scanned_at: string;
  voided_at?: string | null;
};

export function deriveStudentTripStatusValue(
  records: AttendanceSlice[],
  direction: TripDirection,
): StudentTripStatusValue {
  const active = records
    .filter((record) => !record.voided_at)
    .sort((left, right) => left.scanned_at.localeCompare(right.scanned_at));

  let boarded = false;
  let dropped = false;
  let absent = false;

  for (const record of active) {
    if (record.event_type === "ausente") {
      absent = true;
      break;
    }

    if (record.event_type === "subio" || record.event_type === "manual") {
      boarded = true;
    }

    if (record.event_type === "bajo") {
      dropped = true;
    }
  }

  if (absent) {
    return "absent";
  }

  if (direction === "recojo") {
    if (boarded && !dropped) {
      return "onboard";
    }
    if (dropped) {
      return "at_school";
    }
  } else {
    if (boarded && !dropped) {
      return "returning";
    }
    if (dropped) {
      return "dropped_off";
    }
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
  const active = records
    .filter((record) => !record.voided_at)
    .sort((left, right) => left.scanned_at.localeCompare(right.scanned_at));
  const last = active.at(-1);

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
