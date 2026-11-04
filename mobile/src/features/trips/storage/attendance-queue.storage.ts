import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AttendanceEventType } from "@/src/features/trips/types";

const QUEUE_KEY = "@buscontrol/attendance-queue";
const CORRUPT_KEY = `${QUEUE_KEY}:corrupt`;

export type QueuedAttendanceWrite = {
  id: string;
  tripId: string;
  studentId: string;
  eventType: AttendanceEventType;
  createdAt: string;
  scannedBy?: string | null;
};

function isQueuedWrite(value: unknown): value is QueuedAttendanceWrite {
  const entry = value as Partial<QueuedAttendanceWrite> | null;
  return (
    typeof entry?.id === "string" &&
    typeof entry.tripId === "string" &&
    typeof entry.studentId === "string" &&
    typeof entry.eventType === "string" &&
    typeof entry.createdAt === "string"
  );
}

/** Conserva lo que no se pudo leer: son asistencias que aun no llegaron al servidor. */
async function backupUnreadable(raw: string): Promise<void> {
  try {
    const previous = await AsyncStorage.getItem(CORRUPT_KEY);
    await AsyncStorage.setItem(CORRUPT_KEY, previous ? `${previous}\n${raw}` : raw);
  } catch {
    /* sin espacio: no hay otro lugar donde guardarlo */
  }
}

async function readQueue(): Promise<QueuedAttendanceWrite[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  if (!Array.isArray(parsed)) {
    await backupUnreadable(raw);
    await AsyncStorage.removeItem(QUEUE_KEY);
    return [];
  }

  const valid = parsed.filter(isQueuedWrite);
  if (valid.length !== parsed.length) {
    await backupUnreadable(JSON.stringify(parsed.filter((entry) => !isQueuedWrite(entry))));
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(valid));
  }
  return valid;
}

async function writeQueue(queue: QueuedAttendanceWrite[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// ponytail: mutex global del proceso; toda la cola vive en una sola clave.
let queueLock: Promise<unknown> = Promise.resolve();

function withQueueLock<T>(task: () => Promise<T>): Promise<T> {
  const run = queueLock.then(task, task);
  queueLock = run.catch(() => undefined);
  return run;
}

export function queueEntryKey(
  tripId: string,
  studentId: string,
  eventType: AttendanceEventType,
): string {
  return `${tripId}:${studentId}:${eventType}`;
}

/** Solo lectura: si falla el almacenamiento, operar sin cola es mejor que bloquear la app. */
export function loadAttendanceQueue(): Promise<QueuedAttendanceWrite[]> {
  return withQueueLock(readQueue).catch(() => []);
}

export function enqueueAttendanceWrite(
  entry: Omit<QueuedAttendanceWrite, "id" | "createdAt">,
): Promise<QueuedAttendanceWrite> {
  return withQueueLock(async () => {
    const queue = await readQueue();
    const key = queueEntryKey(entry.tripId, entry.studentId, entry.eventType);

    const existing = queue.find(
      (item) =>
        queueEntryKey(item.tripId, item.studentId, item.eventType) === key &&
        item.scannedBy === entry.scannedBy,
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
  });
}

export function removeAttendanceWrite(id: string): Promise<void> {
  return withQueueLock(async () => {
    const queue = await readQueue();
    await writeQueue(queue.filter((item) => item.id !== id));
  });
}

export function removeQueuedWrite(
  tripId: string,
  studentId: string,
  eventType: AttendanceEventType,
): Promise<QueuedAttendanceWrite | null> {
  return withQueueLock(async () => {
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
  });
}

export async function countPendingForTrip(tripId: string): Promise<number> {
  const queue = await loadAttendanceQueue();
  return queue.filter((item) => item.tripId === tripId).length;
}

export async function hasQueuedWrite(
  tripId: string,
  studentId: string,
  eventType: AttendanceEventType,
  scannedBy: string,
): Promise<boolean> {
  const queue = await loadAttendanceQueue();
  const key = queueEntryKey(tripId, studentId, eventType);
  return queue.some(
    (item) =>
      queueEntryKey(item.tripId, item.studentId, item.eventType) === key &&
      (!item.scannedBy || item.scannedBy === scannedBy),
  );
}

export function clearAttendanceQueue(): Promise<void> {
  return withQueueLock(async () => {
    try {
      await AsyncStorage.removeItem(QUEUE_KEY);
    } catch {
      /* non-fatal */
    }
  });
}
