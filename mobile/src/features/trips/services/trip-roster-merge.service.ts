import { buildTripRosterItems } from "@/src/features/trips/domain/trip-roster.builder";
import {
  loadAttendanceQueue,
  type QueuedAttendanceWrite,
} from "@/src/features/trips/storage/attendance-queue.storage";
import type { TripRosterItem } from "@/src/features/trips/types/trip-roster";
import type { AttendanceEventType, AttendanceRecord } from "@/src/features/trips/types";

function createLocalAttendanceRecord(
  tripId: string,
  studentId: string,
  eventType: AttendanceEventType,
  queueId: string,
): AttendanceRecord {
  return {
    id: `local-${queueId}`,
    trip_id: tripId,
    student_id: studentId,
    event_type: eventType,
    scanned_at: new Date().toISOString(),
    lat: null,
    lng: null,
    operator_id: null,
    is_offline_sync: true,
    scanned_by: null,
    scan_role: null,
    voided_at: null,
    voided_by: null,
    void_reason: null,
  };
}

function queueToAttendanceRecord(entry: QueuedAttendanceWrite): AttendanceRecord {
  return createLocalAttendanceRecord(entry.tripId, entry.studentId, entry.eventType, entry.id);
}

export function mergeAttendanceRecords(
  serverRecords: AttendanceRecord[],
  queuedWrites: QueuedAttendanceWrite[],
): AttendanceRecord[] {
  const seen = new Set(
    serverRecords.map((record) => `${record.student_id}:${record.event_type}`),
  );
  const merged = [...serverRecords];

  for (const entry of queuedWrites) {
    const key = `${entry.studentId}:${entry.eventType}`;
    if (!seen.has(key)) {
      merged.push(queueToAttendanceRecord(entry));
      seen.add(key);
    }
  }

  return merged.sort((a, b) => {
    const aTime = a.scanned_at ? new Date(a.scanned_at).getTime() : 0;
    const bTime = b.scanned_at ? new Date(b.scanned_at).getTime() : 0;
    return aTime - bTime;
  });
}

export function createOptimisticAttendanceRecord(
  tripId: string,
  studentId: string,
  eventType: AttendanceEventType,
  queueId: string,
): AttendanceRecord {
  return createLocalAttendanceRecord(tripId, studentId, eventType, queueId);
}

export async function buildRosterItemsFromSources(
  tripId: string,
  students: TripRosterItem["student"][],
  serverRecords: AttendanceRecord[],
): Promise<TripRosterItem[]> {
  const queue = await loadAttendanceQueue();
  const tripQueue = queue.filter((entry) => entry.tripId === tripId);
  const merged = mergeAttendanceRecords(serverRecords, tripQueue);
  return buildTripRosterItems(students, merged, tripQueue);
}
