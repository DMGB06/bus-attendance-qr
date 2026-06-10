import { registerAttendance, registerDropoffAttendance } from "@/src/features/trips/services/attendance.service";
import { perfAsync, perfStart } from "@/src/shared/utils/perfMark";
import {
  canRegisterBoarding,
  canRegisterDropoff,
  canRegisterAbsent,
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
  isStudentsCacheFresh,
  loadCachedRosterSnapshot,
  loadCachedStudents,
  loadCachedTripAttendance,
  saveCachedStudents,
  saveCachedTripAttendance,
  saveCachedRosterSnapshot,
} from "@/src/features/trips/storage/roster-cache.storage";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";
import { getTripAttendanceOnly, getTripRosterRaw } from "@/src/features/trips/services/trip-roster.service";
import type { AttendanceEventType, AttendanceRecord } from "@/src/features/trips/types";

export type AttendanceRegistrationResult =
  | { status: "synced" }
  | { status: "queued" }
  | { status: "duplicate" };

function isDuplicateError(message: string): boolean {
  return message === "Ya registrado";
}

function isMissingBoardingError(message: string): boolean {
  return message.includes("Primero debes registrar la asistencia de entrada");
}

function isBoardingEventType(eventType: AttendanceEventType): boolean {
  return eventType === "subio" || eventType === "manual" || eventType === "ausente";
}

function sortQueueForFlush(entries: QueuedAttendanceWrite[]): QueuedAttendanceWrite[] {
  return [...entries].sort((left, right) => {
    const leftIsDropoff = left.eventType === "bajo" ? 1 : 0;
    const rightIsDropoff = right.eventType === "bajo" ? 1 : 0;
    if (leftIsDropoff !== rightIsDropoff) {
      return leftIsDropoff - rightIsDropoff;
    }
    return left.createdAt.localeCompare(right.createdAt);
  });
}

async function hasLocalBoardingRecord(tripId: string, studentId: string): Promise<boolean> {
  const cached = await loadCachedTripAttendance(tripId);
  const queue = await loadAttendanceQueue();
  const merged = mergeAttendanceRecords(cached?.records ?? [], queue);
  const hasBoarding = merged.some(
    (record) =>
      record.student_id === studentId &&
      (record.event_type === "subio" || record.event_type === "manual"),
  );
  const hasDropoff = merged.some(
    (record) => record.student_id === studentId && record.event_type === "bajo",
  );
  return hasBoarding && !hasDropoff;
}

async function flushBoardingWritesForStudent(tripId: string, studentId: string): Promise<void> {
  const queue = await loadAttendanceQueue();
  const boardingEntries = queue.filter(
    (entry) =>
      entry.tripId === tripId &&
      entry.studentId === studentId &&
      isBoardingEventType(entry.eventType),
  );

  for (const entry of boardingEntries) {
    try {
      await registerAttendance(entry.tripId, entry.studentId, entry.eventType);
      await removeAttendanceWrite(entry.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      if (isDuplicateError(message)) {
        await removeAttendanceWrite(entry.id);
        continue;
      }
      throw error;
    }
  }
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

  if (eventType === "ausente" && !canRegisterAbsent(item)) {
    return getDuplicateRegistrationMessage(eventType);
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

    if (eventType === "bajo" && isMissingBoardingError(message)) {
      const hasBoarding = await hasLocalBoardingRecord(tripId, studentId);
      if (hasBoarding) {
        try {
          await flushBoardingWritesForStudent(tripId, studentId);
          await registerDropoffAttendance(tripId, studentId);
          return { status: "synced" };
        } catch (retryError: unknown) {
          const retryMessage = retryError instanceof Error ? retryError.message : "";
          if (isDuplicateError(retryMessage)) {
            return { status: "duplicate" };
          }
          await enqueueAttendanceWrite({ tripId, studentId, eventType });
          return { status: "queued" };
        }
      }
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
  const pending = sortQueueForFlush(
    tripId ? queue.filter((entry) => entry.tripId === tripId) : queue,
  );

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

async function canUseAttendanceOnlyRefresh(): Promise<boolean> {
  const cachedStudents = await loadCachedStudents();
  return Boolean(
    cachedStudents?.students.length && isStudentsCacheFresh(cachedStudents.savedAt),
  );
}

async function refreshRosterFull(tripId: string): Promise<{
  items: TripRosterItem[];
  fromCache: boolean;
  cacheSavedAt: string | null;
}> {
  const { students, attendanceRecords } = await getTripRosterRaw(tripId);
  await saveCachedStudents(students);
  await saveCachedTripAttendance(tripId, attendanceRecords);

  const items = await buildRosterItemsFromSources(tripId, students, attendanceRecords);
  await persistRosterSnapshot(tripId, items);

  return { items, fromCache: false, cacheSavedAt: new Date().toISOString() };
}

async function refreshRosterAttendanceOnly(tripId: string): Promise<{
  items: TripRosterItem[];
  fromCache: boolean;
  cacheSavedAt: string | null;
}> {
  const cachedStudents = await loadCachedStudents();
  if (!cachedStudents?.students.length) {
    return refreshRosterFull(tripId);
  }

  const attendanceRecords = await getTripAttendanceOnly(tripId);
  await saveCachedTripAttendance(tripId, attendanceRecords);

  const items = await buildRosterItemsFromSources(
    tripId,
    cachedStudents.students,
    attendanceRecords,
  );
  await persistRosterSnapshot(tripId, items);

  return {
    items,
    fromCache: false,
    cacheSavedAt: cachedStudents.savedAt,
  };
}

export async function refreshRosterFromNetwork(
  tripId: string,
  options?: { skipQueueFlush?: boolean; forceFullSync?: boolean },
): Promise<{
  items: TripRosterItem[];
  fromCache: boolean;
  cacheSavedAt: string | null;
}> {
  const forceFullSync = options?.forceFullSync ?? false;

  return perfAsync(
    "refreshRosterFromNetwork",
    async () => {
      if (!options?.skipQueueFlush) {
        const endFlush = perfStart("refreshRosterFromNetwork.flushQueue", { tripId });
        await flushAttendanceQueue(tripId);
        endFlush();
      }

      const useAttendanceOnly = !forceFullSync && (await canUseAttendanceOnlyRefresh());

      try {
        if (useAttendanceOnly) {
          const endMode = perfStart("refreshRosterFromNetwork.mode", {
            tripId,
            mode: "attendance-only",
          });
          try {
            return await refreshRosterAttendanceOnly(tripId);
          } finally {
            endMode();
          }
        }

        const endMode = perfStart("refreshRosterFromNetwork.mode", { tripId, mode: "full" });
        try {
          return await refreshRosterFull(tripId);
        } finally {
          endMode();
        }
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
    },
    { tripId, forceFullSync },
  );
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

export function collectBulkDropoffTargets(
  items: TripRosterItem[],
  studentIds?: string[],
): { eligible: string[]; skipped: Array<{ studentId: string; reason: string }> } {
  const candidates = studentIds?.length
    ? studentIds
    : items.filter((item) => item.status === "onboard").map((item) => item.student.id);

  const eligible: string[] = [];
  const skipped: Array<{ studentId: string; reason: string }> = [];

  for (const studentId of candidates) {
    const error = validateRegistration(items, studentId, "bajo");
    if (error) {
      skipped.push({ studentId, reason: error });
    } else {
      eligible.push(studentId);
    }
  }

  return { eligible, skipped };
}

export async function applyOptimisticBulkDropoff(
  tripId: string,
  studentIds: string[],
  currentItems: TripRosterItem[],
): Promise<TripRosterItem[]> {
  for (const studentId of studentIds) {
    const validationError = validateRegistration(currentItems, studentId, "bajo");
    if (validationError) {
      throw new Error(validationError);
    }
  }

  const students = currentItems.map((entry) => entry.student);
  const cachedAttendance = await loadCachedTripAttendance(tripId);
  const queue = await loadAttendanceQueue();
  let merged = mergeAttendanceRecords(cachedAttendance?.records ?? [], queue);

  const timestamp = Date.now();
  for (const studentId of studentIds) {
    merged = [
      ...merged,
      createLocalAttendanceRecord(tripId, studentId, "bajo", `optimistic-${timestamp}-${studentId}`),
    ];
  }

  const nextItems = buildTripRosterItems(students, merged);
  await saveCachedTripAttendance(tripId, merged);
  await persistRosterSnapshot(tripId, nextItems);
  return nextItems;
}

export async function syncBulkDropoffToServer(
  tripId: string,
  studentIds: string[],
): Promise<{ syncedCount: number; queuedCount: number; failedCount: number }> {
  await flushAttendanceQueue(tripId);

  let syncedCount = 0;
  let queuedCount = 0;
  let failedCount = 0;

  for (const studentId of studentIds) {
    try {
      const result = await syncAttendanceToServer(tripId, studentId, "bajo");

      if (result.status === "queued") {
        queuedCount += 1;
      } else {
        syncedCount += 1;
      }
    } catch {
      failedCount += 1;
    }
  }

  if (queuedCount > 0) {
    await flushAttendanceQueue(tripId);
  }

  return { syncedCount, queuedCount, failedCount };
}

export async function bulkRegisterDropoff(
  tripId: string,
  items: TripRosterItem[],
  studentIds?: string[],
): Promise<{ eligible: string[]; syncedCount: number; queuedCount: number }> {
  const { eligible } = collectBulkDropoffTargets(items, studentIds);

  if (eligible.length === 0) {
    throw new Error("No hay alumnos a bordo para registrar la bajada.");
  }

  const { syncedCount, queuedCount } = await syncBulkDropoffToServer(tripId, eligible);
  return { eligible, syncedCount, queuedCount };
}
