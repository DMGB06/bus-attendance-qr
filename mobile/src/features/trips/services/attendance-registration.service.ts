import NetInfo from "@react-native-community/netinfo";

import {
  isLocalPendingRecord,
  isQueueEntrySyncedOnServer,
} from "@/src/features/trips/domain/attendance-sync.rules";
import { shouldFlushAttendanceQueueBeforeRefresh } from "@/src/features/trips/domain/attendance-queue-flush.rules";
import { registerAttendance, registerDropoffAttendance, voidAttendanceRecord } from "@/src/features/trips/services/attendance.service";
import { getUser } from "@/src/features/auth/services/auth.service";
import {
  getScanContextForCurrentUser,
  type ScanContext,
} from "@/src/features/trips/services/crew.service";
import { withDeadline, withTimeout } from "@/src/shared/utils/withTimeout";
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
  buildRosterItemsFromSources,
  createOptimisticAttendanceRecord,
  mergeAttendanceRecords,
} from "@/src/features/trips/services/trip-roster-merge.service";
import { getTripAttendanceOnly, getTripRosterRaw } from "@/src/features/trips/services/trip-roster.service";
import type { TripRosterItem } from "@/src/features/trips/types/trip-roster";
import type { AttendanceEventType, AttendanceRecord } from "@/src/features/trips/types";
import {
  countPendingForTrip,
  enqueueAttendanceWrite,
  hasQueuedWrite,
  loadAttendanceQueue,
  removeAttendanceWrite,
  removeQueuedWrite,
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

export { mergeAttendanceRecords } from "@/src/features/trips/services/trip-roster-merge.service";

const SCAN_CONTEXT_TIMEOUT_MS = 2_500;
const ROSTER_REFRESH_TIMEOUT_MS = 12_000;

export type AttendanceRegistrationResult =
  | { status: "synced" }
  | { status: "queued"; scannedBy: string }
  | { status: "duplicate" };

function isDuplicateError(message: string): boolean {
  return message === "Ya registrado";
}

function isMissingBoardingError(message: string): boolean {
  return message.includes("Primero debes registrar");
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

function isOwnEntry(entry: QueuedAttendanceWrite, userId: string): boolean {
  return !entry.scannedBy || entry.scannedBy === userId;
}

/** El rol es informativo: nunca debe retrasar el registro de una asistencia. */
function resolveScanContext(userId: string): Promise<ScanContext> {
  return withTimeout(getScanContextForCurrentUser(), SCAN_CONTEXT_TIMEOUT_MS, {
    scannedBy: userId,
    scanRole: null,
  });
}

async function flushBoardingWritesForStudent(
  tripId: string,
  studentId: string,
  scan: ScanContext,
): Promise<void> {
  const queue = await loadAttendanceQueue();
  const boardingEntries = queue.filter(
    (entry) =>
      entry.tripId === tripId &&
      entry.studentId === studentId &&
      isBoardingEventType(entry.eventType) &&
      isOwnEntry(entry, scan.scannedBy),
  );

  for (const entry of boardingEntries) {
    try {
      await registerAttendance(entry.tripId, entry.studentId, entry.eventType, scan);
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
    msg.includes("abort") ||
    msg.includes("internet")
  );
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

function replaceActiveEventInRecords(
  records: AttendanceRecord[],
  localRecord: AttendanceRecord,
): AttendanceRecord[] {
  const withoutSameActiveEvent = records.filter(
    (record) =>
      !(
        record.student_id === localRecord.student_id &&
        record.event_type === localRecord.event_type &&
        record.voided_at == null
      ),
  );

  return [...withoutSameActiveEvent, localRecord];
}

export async function voidSyncedAttendanceRecord(
  tripId: string,
  recordId: string,
  studentId: string,
  eventType: AttendanceEventType,
  reason: string,
): Promise<TripRosterItem[]> {
  await voidAttendanceRecord(recordId, reason);
  await removeQueuedWrite(tripId, studentId, eventType);

  const cachedAttendance = await loadCachedTripAttendance(tripId);
  if (cachedAttendance) {
    const voidedAt = new Date().toISOString();
    await saveCachedTripAttendance(
      tripId,
      cachedAttendance.records.map((record) =>
        record.id === recordId ? { ...record, voided_at: voidedAt } : record,
      ),
    );
  }

  const result = await refreshRosterFromNetwork(tripId, { forceFullSync: true });
  return result.items;
}

export async function syncAttendanceToServer(
  tripId: string,
  studentId: string,
  eventType: AttendanceEventType,
): Promise<AttendanceRegistrationResult> {
  const user = await getUser();
  if (!user) {
    throw new Error("Debes iniciar sesión para registrar asistencia.");
  }

  const alreadyQueued = await hasQueuedWrite(tripId, studentId, eventType, user.id);
  if (alreadyQueued) {
    return { status: "queued", scannedBy: user.id };
  }

  // Sin senal se guarda ya: esperar al servidor arriesga perderlo si se cierra la app.
  const { isConnected } = await NetInfo.fetch();
  if (isConnected === false) {
    await enqueueAttendanceWrite({ tripId, studentId, eventType, scannedBy: user.id });
    return { status: "queued", scannedBy: user.id };
  }

  const scan = await resolveScanContext(user.id);

  try {
    if (eventType === "bajo") {
      await registerDropoffAttendance(tripId, studentId, scan);
    } else {
      await registerAttendance(tripId, studentId, eventType, scan);
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
          await flushBoardingWritesForStudent(tripId, studentId, scan);
          await registerDropoffAttendance(tripId, studentId, scan);
          return { status: "synced" };
        } catch (retryError: unknown) {
          const retryMessage = retryError instanceof Error ? retryError.message : "";
          if (isDuplicateError(retryMessage)) {
            return { status: "duplicate" };
          }
          if (!isNetworkError(retryError)) {
            throw retryError;
          }
          await enqueueAttendanceWrite({
            tripId,
            studentId,
            eventType,
            scannedBy: scan.scannedBy,
          });
          return { status: "queued", scannedBy: scan.scannedBy };
        }
      }
    }

    if (!isNetworkError(error)) {
      throw error;
    }

    await enqueueAttendanceWrite({
      tripId,
      studentId,
      eventType,
      scannedBy: scan.scannedBy,
    });
    return { status: "queued", scannedBy: scan.scannedBy };
  }
}

export async function flushAttendanceQueue(tripId?: string): Promise<number> {
  const queue = await loadAttendanceQueue();
  const tripQueue = tripId ? queue.filter((entry) => entry.tripId === tripId) : queue;
  if (tripQueue.length === 0) {
    return 0;
  }

  const user = await getUser();
  if (!user) {
    return 0;
  }

  const scan = await resolveScanContext(user.id);
  // El servidor firma con el usuario actual: lo de otra cuenta espera a que esa cuenta vuelva.
  const pending = sortQueueForFlush(tripQueue.filter((entry) => isOwnEntry(entry, user.id)));

  let flushed = 0;

  for (const entry of pending) {
    try {
      if (entry.eventType === "bajo") {
        await registerDropoffAttendance(entry.tripId, entry.studentId, scan);
      } else {
        await registerAttendance(entry.tripId, entry.studentId, entry.eventType, scan);
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
      // Error de servidor/permisos: conservar esta entrada y seguir con las demas.
    }
  }

  return flushed;
}

/** Quita de la cola local entradas que ya existen en el servidor (evita "Pendiente sync" falso). */
export async function pruneStaleQueueEntriesForTrip(tripId: string): Promise<number> {
  const queue = await loadAttendanceQueue();
  const tripEntries = queue.filter((entry) => entry.tripId === tripId);
  if (tripEntries.length === 0) {
    return 0;
  }

  let serverRecords: AttendanceRecord[];
  try {
    serverRecords = await getTripAttendanceOnly(tripId);
  } catch {
    // La cache incluye registros optimistas locales: no prueba que el servidor los tenga.
    return 0;
  }

  let pruned = 0;
  for (const entry of tripEntries) {
    if (isQueueEntrySyncedOnServer(entry, serverRecords)) {
      await removeAttendanceWrite(entry.id);
      pruned += 1;
    }
  }

  return pruned;
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
  // El padron nunca queda vacio de verdad: se trata como fallo para conservar lo guardado.
  if (students.length === 0) {
    throw new Error("El padron llego vacio.");
  }
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
      if (
        shouldFlushAttendanceQueueBeforeRefresh(
          await countPendingForTrip(tripId),
          options?.skipQueueFlush,
        )
      ) {
        const endFlush = perfStart("refreshRosterFromNetwork.flushQueue", { tripId });
        await flushAttendanceQueue(tripId);
        await pruneStaleQueueEntriesForTrip(tripId);
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
            return await withDeadline(refreshRosterAttendanceOnly(tripId), ROSTER_REFRESH_TIMEOUT_MS);
          } finally {
            endMode();
          }
        }

        const endMode = perfStart("refreshRosterFromNetwork.mode", { tripId, mode: "full" });
        try {
          return await withDeadline(refreshRosterFull(tripId), ROSTER_REFRESH_TIMEOUT_MS);
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

  const localRecord = createOptimisticAttendanceRecord(
    tripId,
    studentId,
    eventType,
    `optimistic-${Date.now()}`,
  );
  const nextRecords = replaceActiveEventInRecords(merged, localRecord);
  const nextItems = buildTripRosterItems(students, nextRecords);

  await saveCachedTripAttendance(tripId, nextRecords);
  await persistRosterSnapshot(tripId, nextItems);
  return nextItems;
}

export function collectBulkDropoffTargets(
  items: TripRosterItem[],
  studentIds?: string[],
): { eligible: string[]; skipped: { studentId: string; reason: string }[] } {
  const candidates = studentIds?.length
    ? studentIds
    : items.filter((item) => item.status === "onboard").map((item) => item.student.id);

  const eligible: string[] = [];
  const skipped: { studentId: string; reason: string }[] = [];

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
    const localRecord = createOptimisticAttendanceRecord(
      tripId,
      studentId,
      "bajo",
      `optimistic-${timestamp}-${studentId}`,
    );
    merged = replaceActiveEventInRecords(merged, localRecord);
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

export async function undoPendingRegistration(
  tripId: string,
  studentId: string,
  eventType: AttendanceEventType,
): Promise<TripRosterItem[]> {
  const removed = await removeQueuedWrite(tripId, studentId, eventType);
  if (!removed) {
    throw new Error("No hay un registro pendiente para deshacer.");
  }

  const [cachedStudents, cachedAttendance] = await Promise.all([
    loadCachedStudents(),
    loadCachedTripAttendance(tripId),
  ]);

  if (!cachedStudents?.students.length) {
    throw new Error("No se pudo reconstruir la lista local.");
  }

  const serverRecords = (cachedAttendance?.records ?? []).filter(
    (record) =>
      !(
        isLocalPendingRecord(record) &&
        record.student_id === studentId &&
        record.event_type === eventType
      ),
  );

  const queue = await loadAttendanceQueue();
  const tripQueue = queue.filter((entry) => entry.tripId === tripId);
  const merged = mergeAttendanceRecords(serverRecords, tripQueue);

  await saveCachedTripAttendance(tripId, merged);

  const items = buildTripRosterItems(cachedStudents.students, merged, tripQueue);
  await persistRosterSnapshot(tripId, items);
  return items;
}
