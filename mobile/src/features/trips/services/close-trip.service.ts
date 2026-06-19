import { getOnboardStudentsFromRoster } from "@/src/features/trips/domain/trip-roster.pending";
import { flushAttendanceQueue } from "@/src/features/trips/services/attendance-registration.service";
import {
  getPendingDropoffStudents,
  type PendingDropoffStudent,
} from "@/src/features/trips/services/attendance.service";
import {
  clearTripRosterCache,
  loadCachedRosterSnapshot,
} from "@/src/features/trips/storage/roster-cache.storage";
import { getRosterSnapshot } from "@/src/features/trips/store/rosterStore";
import { withTimeout } from "@/src/shared/utils/withTimeout";

const PENDING_CHECK_TIMEOUT_MS = 8_000;
const QUEUE_FLUSH_TIMEOUT_MS = 4_000;

export const CLOSE_TRIP_CONNECTIVITY_WARNING =
  "Revisa tu conexión. Mostramos los datos guardados en el dispositivo.";

export type PendingDropoffResolution = {
  students: PendingDropoffStudent[];
  networkTimedOut: boolean;
};

function getLocalPendingDropoff(tripId: string): PendingDropoffStudent[] {
  const rosterState = getRosterSnapshot();

  if (rosterState.tripId === tripId && rosterState.items.length > 0) {
    return getOnboardStudentsFromRoster(rosterState.items);
  }

  return [];
}

async function getCachedPendingDropoff(tripId: string): Promise<PendingDropoffStudent[]> {
  const cachedSnapshot = await loadCachedRosterSnapshot(tripId);
  if (!cachedSnapshot?.items.length) {
    return [];
  }
  return getOnboardStudentsFromRoster(cachedSnapshot.items);
}

function hasLocalRosterForTrip(tripId: string): boolean {
  const rosterState = getRosterSnapshot();
  return rosterState.tripId === tripId && rosterState.items.length > 0;
}

async function tryFlushQueueForClose(tripId: string): Promise<void> {
  try {
    await withTimeout(flushAttendanceQueue(tripId), QUEUE_FLUSH_TIMEOUT_MS, 0);
  } catch {
    /* Si la red falla, el roster local sigue siendo la mejor referencia disponible. */
  }
}

/**
 * Alineado con la lista: el roster en memoria ya fusiona servidor + cola offline.
 * Con datos locales, responde al instante y sincroniza la cola en segundo plano.
 */
export async function resolvePendingDropoffStudents(
  tripId: string,
): Promise<PendingDropoffResolution> {
  if (hasLocalRosterForTrip(tripId)) {
    void tryFlushQueueForClose(tripId);
    return {
      students: getLocalPendingDropoff(tripId),
      networkTimedOut: false,
    };
  }

  await tryFlushQueueForClose(tripId);

  const localPending = getLocalPendingDropoff(tripId);
  if (hasLocalRosterForTrip(tripId)) {
    return { students: localPending, networkTimedOut: false };
  }

  const serverPending = await withTimeout(
    getPendingDropoffStudents(tripId),
    PENDING_CHECK_TIMEOUT_MS,
    null,
  );

  if (serverPending !== null) {
    return { students: serverPending, networkTimedOut: false };
  }

  if (localPending.length > 0) {
    return { students: localPending, networkTimedOut: true };
  }

  const cachedPending = await getCachedPendingDropoff(tripId);
  return {
    students: cachedPending,
    networkTimedOut: cachedPending.length > 0,
  };
}

/** Solo envía la cola offline — sin recargar el padrón completo. */
export async function flushPendingAttendanceForClose(tripId: string): Promise<void> {
  await flushAttendanceQueue(tripId);
}

export async function cleanupTripAfterClose(tripId: string): Promise<void> {
  await clearTripRosterCache(tripId);
}
