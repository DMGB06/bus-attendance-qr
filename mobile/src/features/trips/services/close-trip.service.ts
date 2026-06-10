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

/**
 * Alineado con la lista: el roster en memoria ya fusiona servidor + cola offline.
 * Se sincroniza la cola antes de consultar el servidor como respaldo.
 */
export async function resolvePendingDropoffStudents(
  tripId: string,
): Promise<PendingDropoffResolution> {
  try {
    await flushAttendanceQueue(tripId);
  } catch {
    /* Si la red falla, el roster local sigue siendo la mejor referencia disponible. */
  }

  const localPending = getLocalPendingDropoff(tripId);
  const rosterState = getRosterSnapshot();
  if (rosterState.tripId === tripId && rosterState.items.length > 0) {
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
