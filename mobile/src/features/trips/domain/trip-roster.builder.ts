import type { AttendanceRecord, Student } from "@/src/features/trips/types";
import type { TripRosterItem, TripRosterStatus } from "@/src/features/trips/services/trip-roster.service";

export function groupAttendanceByStudent(
  records: AttendanceRecord[],
): Map<string, AttendanceRecord[]> {
  const map = new Map<string, AttendanceRecord[]>();

  for (const record of records) {
    const history = map.get(record.student_id) ?? [];
    history.push(record);
    map.set(record.student_id, history);
  }

  return map;
}

export function deriveRosterStatus(history: AttendanceRecord[]): TripRosterStatus {
  const hasBoarding = history.some(
    (record) => record.event_type === "subio" || record.event_type === "manual",
  );
  const hasDropoff = history.some((record) => record.event_type === "bajo");

  if (hasDropoff) {
    return "completed";
  }
  if (hasBoarding) {
    return "onboard";
  }
  if (history.some((record) => record.event_type === "ausente")) {
    return "completed";
  }
  return "pending";
}

export function buildTripRosterItems(
  students: Student[],
  attendanceRecords: AttendanceRecord[],
): TripRosterItem[] {
  const attendanceByStudent = groupAttendanceByStudent(attendanceRecords);

  return students.map((student) => {
    const history = attendanceByStudent.get(student.id) ?? [];
    const attendance = history.length > 0 ? history[history.length - 1] : null;
    const status = deriveRosterStatus(history);

    return {
      student,
      attendance,
      status,
      hasAttendance: history.length > 0,
      canMarkManual: status === "pending",
      canMarkExit: status === "onboard",
    };
  });
}
