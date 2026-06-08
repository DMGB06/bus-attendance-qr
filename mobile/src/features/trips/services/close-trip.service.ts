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
 * Fuente de verdad: servidor (solo registros del viaje).
 * Caché/local solo si la red falla — evita falsos "a bordo" por estado optimista.
 */
export async function resolvePendingDropoffStudents(
  tripId: string,
): Promise<PendingDropoffStudent[]> {
  const serverPending = await withTimeout(
    getPendingDropoffStudents(tripId),
    PENDING_CHECK_TIMEOUT_MS,
    null,
  );

  if (serverPending !== null) {
    return serverPending;
  }

  const localPending = getLocalPendingDropoff(tripId);
  if (localPending.length > 0) {
    return localPending;
  }

  return getCachedPendingDropoff(tripId);
}

/** Solo envía la cola offline — sin recargar el padrón completo. */
export async function flushPendingAttendanceForClose(tripId: string): Promise<void> {
  await flushAttendanceQueue(tripId);
}

export async function cleanupTripAfterClose(tripId: string): Promise<void> {
  await clearTripRosterCache(tripId);
}
