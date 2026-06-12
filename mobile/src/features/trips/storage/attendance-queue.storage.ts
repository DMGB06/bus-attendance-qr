import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AttendanceEventType } from "@/src/features/trips/types";

const QUEUE_KEY = "@buscontrol/attendance-queue";

export type QueuedAttendanceWrite = {
  id: string;
  tripId: string;
  studentId: string;
  eventType: AttendanceEventType;
  createdAt: string;
  scannedBy?: string | null;
};

async function readQueue(): Promise<QueuedAttendanceWrite[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as QueuedAttendanceWrite[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedAttendanceWrite[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* non-fatal */
  }
}

export function queueEntryKey(
  tripId: string,
  studentId: string,
  eventType: AttendanceEventType,
): string {
  return `${tripId}:${studentId}:${eventType}`;
}

export async function loadAttendanceQueue(): Promise<QueuedAttendanceWrite[]> {
  return readQueue();
}

export async function enqueueAttendanceWrite(
  entry: Omit<QueuedAttendanceWrite, "id" | "createdAt">,
): Promise<QueuedAttendanceWrite> {
  const queue = await readQueue();
  const key = queueEntryKey(entry.tripId, entry.studentId, entry.eventType);

  const existing = queue.find(
    (item) => queueEntryKey(item.tripId, item.studentId, item.eventType) === key,
  );
  if (existing) {
    return existing;
  }

  const next: QueuedAttendanceWrite = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
  };

  await writeQueue([...queue, next]);
  return next;
}

export async function removeAttendanceWrite(id: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((item) => item.id !== id));
}

export async function removeQueuedWrite(
  tripId: string,
  studentId: string,
  eventType: AttendanceEventType,
): Promise<QueuedAttendanceWrite | null> {
  const queue = await readQueue();
  const key = queueEntryKey(tripId, studentId, eventType);
  const target = queue.find(
    (item) => queueEntryKey(item.tripId, item.studentId, item.eventType) === key,
  );

  if (!target) {
    return null;
  }

  await writeQueue(queue.filter((item) => item.id !== target.id));
  return target;
}

export async function countPendingForTrip(tripId: string): Promise<number> {
  const queue = await readQueue();
  return queue.filter((item) => item.tripId === tripId).length;
}

export async function hasQueuedWrite(
  tripId: string,
  studentId: string,
  eventType: AttendanceEventType,
): Promise<boolean> {
  const queue = await readQueue();
  const key = queueEntryKey(tripId, studentId, eventType);
  return queue.some(
    (item) => queueEntryKey(item.tripId, item.studentId, item.eventType) === key,
  );
}

export async function findQueuedWrite(
  tripId: string,
  studentId: string,
  eventType: AttendanceEventType,
): Promise<QueuedAttendanceWrite | null> {
  const queue = await readQueue();
  const key = queueEntryKey(tripId, studentId, eventType);
  return (
    queue.find(
      (item) => queueEntryKey(item.tripId, item.studentId, item.eventType) === key,
    ) ?? null
  );
}
