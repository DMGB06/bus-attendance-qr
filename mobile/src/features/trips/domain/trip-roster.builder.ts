import {
  findQueueEntryForRecord,
  isActiveAttendanceRecord,
  isRecordPendingSync,
} from "@/src/features/trips/domain/attendance-sync.rules";
import type { QueuedAttendanceWrite } from "@/src/features/trips/storage/attendance-queue.storage";
import type { AttendanceRecord, Student } from "@/src/features/trips/types";
import type { TripRosterItem, TripRosterStatus } from "@/src/features/trips/types/trip-roster";

export function groupAttendanceByStudent(
  records: AttendanceRecord[],
): Map<string, AttendanceRecord[]> {
  const map = new Map<string, AttendanceRecord[]>();

  for (const record of records) {
    if (!isActiveAttendanceRecord(record)) {
      continue;
    }

    const history = map.get(record.student_id) ?? [];
    history.push(record);
    map.set(record.student_id, history);
  }

  return map;
}

export function deriveRosterStatus(history: AttendanceRecord[]): TripRosterStatus {
  const sorted = [...history]
    .filter(isActiveAttendanceRecord)
    .sort((left, right) => {
      const leftTime = left.scanned_at ? new Date(left.scanned_at).getTime() : 0;
      const rightTime = right.scanned_at ? new Date(right.scanned_at).getTime() : 0;
      return leftTime - rightTime;
    });

  if (sorted.length === 0) {
    return "pending";
  }

  let onboard = false;

  for (const record of sorted) {
    if (record.event_type === "ausente") {
      return "completed";
    }

    if (record.event_type === "subio" || record.event_type === "manual") {
      onboard = true;
    }

    if (record.event_type === "bajo") {
      onboard = false;
    }
  }

  return onboard ? "onboard" : "completed";
}

export function buildTripRosterItems(
  students: Student[],
  attendanceRecords: AttendanceRecord[],
  tripQueue: QueuedAttendanceWrite[] = [],
): TripRosterItem[] {
  const attendanceByStudent = groupAttendanceByStudent(attendanceRecords);

  return students.map((student) => {
    const history = attendanceByStudent.get(student.id) ?? [];
    const attendance = history.length > 0 ? history[history.length - 1] : null;
    const status = deriveRosterStatus(history);
    const isPendingSync = isRecordPendingSync(attendance, tripQueue);
    const queueEntry = attendance ? findQueueEntryForRecord(attendance, tripQueue) : undefined;

    return {
      student,
      attendance,
      status,
      hasAttendance: history.length > 0,
      canMarkManual: status === "pending",
      canMarkExit: status === "onboard",
      isPendingSync,
      pendingScannedBy: queueEntry?.scannedBy ?? attendance?.scanned_by ?? null,
    };
  });
}
