import type { AttendanceRecord } from "@/src/features/trips/types";
import type { QueuedAttendanceWrite } from "@/src/features/trips/storage/attendance-queue.storage";
import { queueEntryKey } from "@/src/features/trips/storage/attendance-queue.storage";

export function isLocalPendingRecord(record: AttendanceRecord): boolean {
  return record.id.startsWith("local-") || record.is_offline_sync === true;
}

export function isVoidedRecord(record: AttendanceRecord): boolean {
  return record.voided_at != null;
}

export function isActiveAttendanceRecord(record: AttendanceRecord): boolean {
  return !isVoidedRecord(record);
}

export function findQueueEntryForRecord(
  record: AttendanceRecord,
  queue: QueuedAttendanceWrite[],
): QueuedAttendanceWrite | undefined {
  const key = queueEntryKey(record.trip_id, record.student_id, record.event_type);
  return queue.find(
    (entry) => queueEntryKey(entry.tripId, entry.studentId, entry.eventType) === key,
  );
}

export function isRecordPendingSync(
  record: AttendanceRecord | null,
  queue: QueuedAttendanceWrite[],
): boolean {
  if (!record) {
    return false;
  }

  if (isLocalPendingRecord(record)) {
    return true;
  }

  return Boolean(findQueueEntryForRecord(record, queue));
}

export function canUndoPendingRecord(options: {
  isPendingSync: boolean;
  pendingScannedBy: string | null;
  currentUserId: string | null;
  isDriver: boolean;
  isAssistant: boolean;
}): boolean {
  if (!options.isPendingSync || !options.currentUserId) {
    return false;
  }

  if (options.isDriver) {
    return true;
  }

  if (options.isAssistant) {
    return options.pendingScannedBy === options.currentUserId;
  }

  return false;
}

export function canVoidSyncedRecord(options: {
  record: AttendanceRecord | null;
  isPendingSync: boolean;
  canVoid: boolean;
}): boolean {
  if (!options.canVoid || !options.record || options.isPendingSync) {
    return false;
  }

  return !isLocalPendingRecord(options.record) && !isVoidedRecord(options.record);
}
