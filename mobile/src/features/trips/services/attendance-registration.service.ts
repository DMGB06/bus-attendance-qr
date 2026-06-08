import { registerAttendance, registerDropoffAttendance } from "@/src/features/trips/services/attendance.service";
import {
  canRegisterBoarding,
  canRegisterDropoff,
  findRosterItem,
  getDuplicateRegistrationMessage,
  isBoardingEvent,
} from "@/src/features/trips/domain/attendance.rules";
import { buildTripRosterItems } from "@/src/features/trips/domain/trip-roster.builder";
import {
  enqueueAttendanceWrite,
  hasQueuedWrite,
  loadAttendanceQueue,
  removeAttendanceWrite,
  type QueuedAttendanceWrite,
} from "@/src/features/trips/storage/attendance-queue.storage";
import {
  loadCachedRosterSnapshot,
  loadCachedStudents,
  loadCachedTripAttendance,
  saveCachedStudents,
  saveCachedTripAttendance,
  saveCachedRosterSnapshot,
} from "@/src/features/trips/storage/roster-cache.storage";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";
import { getTripRosterRaw } from "@/src/features/trips/services/trip-roster.service";
import type { AttendanceEventType, AttendanceRecord } from "@/src/features/trips/types";

export type AttendanceRegistrationResult =
  | { status: "synced" }
  | { status: "queued" }
  | { status: "duplicate" };

function isDuplicateError(message: string): boolean {
  return message === "Ya registrado";
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const msg = error.message.toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("failed to fetch") ||
    msg.includes("timeout") ||
    msg.includes("internet")
  );
}

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

export async function buildRosterItemsFromSources(
  tripId: string,
  students: TripRosterItem["student"][],
  serverRecords: AttendanceRecord[],
): Promise<TripRosterItem[]> {
  const queue = await loadAttendanceQueue();
  const tripQueue = queue.filter((entry) => entry.tripId === tripId);
  const merged = mergeAttendanceRecords(serverRecords, tripQueue);
  return buildTripRosterItems(students, merged);
}

export function validateRegistration(
  items: TripRosterItem[],
  studentId: string,
  eventType: AttendanceEventType,
): string | null {
  const item = findRosterItem(items, studentId);

  if (isBoardingEvent(eventType) && !canRegisterBoarding(item)) {
    return getDuplicateRegistrationMessage(eventType);
  }

  if (eventType === "bajo" && !canRegisterDropoff(item)) {
    if (item?.status === "completed") {
      return getDuplicateRegistrationMessage(eventType);
    }
    return "Primero debes registrar la asistencia de entrada del alumno.";
  }

  return null;
}

async function persistRosterSnapshot(tripId: string, items: TripRosterItem[]): Promise<void> {
  await saveCachedRosterSnapshot(tripId, items);
}

export async function syncAttendanceToServer(
  tripId: string,
  studentId: string,
  eventType: AttendanceEventType,
): Promise<AttendanceRegistrationResult> {
  const alreadyQueued = await hasQueuedWrite(tripId, studentId, eventType);
  if (alreadyQueued) {
    return { status: "queued" };
  }

  try {
    if (eventType === "bajo") {
      await registerDropoffAttendance(tripId, studentId);
    } else {
      await registerAttendance(tripId, studentId, eventType);
    }
    return { status: "synced" };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";

    if (isDuplicateError(message)) {
      return { status: "duplicate" };
    }

    if (!isNetworkError(error)) {
      throw error;
    }

    await enqueueAttendanceWrite({ tripId, studentId, eventType });
    return { status: "queued" };
  }
}

export async function flushAttendanceQueue(tripId?: string): Promise<number> {
  const queue = await loadAttendanceQueue();
  const pending = tripId ? queue.filter((entry) => entry.tripId === tripId) : queue;

  let flushed = 0;

  for (const entry of pending) {
    try {
      if (entry.eventType === "bajo") {
        await registerDropoffAttendance(entry.tripId, entry.studentId);
      } else {
        await registerAttendance(entry.tripId, entry.studentId, entry.eventType);
      }
      await removeAttendanceWrite(entry.id);
      flushed += 1;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      if (isDuplicateError(message)) {
        await removeAttendanceWrite(entry.id);
        flushed += 1;
        continue;
      }
      if (isNetworkError(error)) {
        break;
      }
      await removeAttendanceWrite(entry.id);
    }
  }

  return flushed;
}

export async function refreshRosterFromNetwork(tripId: string): Promise<{
  items: TripRosterItem[];
  fromCache: boolean;
  cacheSavedAt: string | null;
}> {
  await flushAttendanceQueue(tripId);

  try {
    const { students, attendanceRecords } = await getTripRosterRaw(tripId);
    await saveCachedStudents(students);
    await saveCachedTripAttendance(tripId, attendanceRecords);

    const items = await buildRosterItemsFromSources(tripId, students, attendanceRecords);
    await persistRosterSnapshot(tripId, items);

    return { items, fromCache: false, cacheSavedAt: new Date().toISOString() };
  } catch {
    const [cachedSnapshot, cachedStudents, cachedAttendance] = await Promise.all([
      loadCachedRosterSnapshot(tripId),
      loadCachedStudents(),
      loadCachedTripAttendance(tripId),
    ]);

    if (cachedSnapshot?.items.length) {
      return {
        items: cachedSnapshot.items,
        fromCache: true,
        cacheSavedAt: cachedSnapshot.savedAt,
      };
    }

    if (cachedStudents?.students.length) {
      const records = cachedAttendance?.records ?? [];
      const items = await buildRosterItemsFromSources(tripId, cachedStudents.students, records);
      return {
        items,
        fromCache: true,
        cacheSavedAt: cachedStudents.savedAt,
      };
    }

    throw new Error("No se pudo cargar la lista de asistencia.");
  }
}

export async function applyOptimisticRegistration(
  tripId: string,
  studentId: string,
  eventType: AttendanceEventType,
  currentItems: TripRosterItem[],
): Promise<TripRosterItem[]> {
  const validationError = validateRegistration(currentItems, studentId, eventType);
  if (validationError) {
    throw new Error(validationError);
  }

  const students = currentItems.map((entry) => entry.student);
  const cachedAttendance = await loadCachedTripAttendance(tripId);
  const queue = await loadAttendanceQueue();
  const merged = mergeAttendanceRecords(cachedAttendance?.records ?? [], queue);

  const localRecord = createLocalAttendanceRecord(
    tripId,
    studentId,
    eventType,
    `optimistic-${Date.now()}`,
  );
  const nextRecords = [...merged, localRecord];
  const nextItems = buildTripRosterItems(students, nextRecords);

  await saveCachedTripAttendance(tripId, nextRecords);
  await persistRosterSnapshot(tripId, nextItems);
  return nextItems;
}
