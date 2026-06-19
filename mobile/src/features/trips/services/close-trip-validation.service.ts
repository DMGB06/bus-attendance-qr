import {
  sortCloseTripStudents,
  toCloseTripStudentRef,
  type CloseTripStudentRef,
  type CloseTripValidationResult,
} from "@/src/features/trips/domain/close-trip-validation";
import { getPrioritaryStudents } from "@/src/features/trips/domain/trip-priority.rules";
import {
  CLOSE_TRIP_CONNECTIVITY_WARNING,
  resolvePendingDropoffStudents,
} from "@/src/features/trips/services/close-trip.service";
import { getMorningAttendanceHints } from "@/src/features/trips/services/trip-day-context.service";
import { perfAsync, perfStart } from "@/src/shared/utils/perfMark";
import {
  getTripRoster,
  type TripRosterItem,
} from "@/src/features/trips/services/trip-roster.service";
import { loadCachedRosterSnapshot } from "@/src/features/trips/storage/roster-cache.storage";
import { getRosterSnapshot } from "@/src/features/trips/store/rosterStore";
import type { Trip } from "@/src/features/trips/types";
import { withTimeout } from "@/src/shared/utils/withTimeout";

const ROSTER_LOAD_TIMEOUT_MS = 8_000;
const MORNING_HINTS_TIMEOUT_MS = 6_000;

export type LoadCloseTripValidationOptions = {
  /** Roster ya hidratado en memoria (p. ej. desde `useRosterItems`). */
  rosterItems?: TripRosterItem[];
};

function mapPendingDropoff(
  students: Awaited<ReturnType<typeof resolvePendingDropoffStudents>>["students"],
) {
  return sortCloseTripStudents(students.map((student) => toCloseTripStudentRef(student)));
}

function mapPrioritarios(
  items: TripRosterItem[],
  morningRiderIds: Set<string>,
): CloseTripStudentRef[] {
  return sortCloseTripStudents(
    getPrioritaryStudents(items, morningRiderIds).map((item) =>
      toCloseTripStudentRef({
        id: item.student.id,
        nombre_alumno: item.student.nombre_alumno,
        direccion: item.student.direccion,
        codigo: item.student.codigo,
      }),
    ),
  );
}

async function resolveRosterItemsForClose(
  tripId: string,
  prefetchedItems?: TripRosterItem[],
): Promise<{ items: TripRosterItem[]; networkTimedOut: boolean }> {
  if (prefetchedItems?.length) {
    return { items: prefetchedItems, networkTimedOut: false };
  }

  const liveSnapshot = getRosterSnapshot();
  if (liveSnapshot.tripId === tripId && liveSnapshot.items.length > 0) {
    return { items: liveSnapshot.items, networkTimedOut: false };
  }

  const cachedSnapshot = await loadCachedRosterSnapshot(tripId);
  if (cachedSnapshot?.items.length) {
    return { items: cachedSnapshot.items, networkTimedOut: false };
  }

  const serverItems = await withTimeout(getTripRoster(tripId), ROSTER_LOAD_TIMEOUT_MS, null);
  if (serverItems) {
    return { items: serverItems, networkTimedOut: false };
  }

  return { items: cachedSnapshot?.items ?? [], networkTimedOut: true };
}

export async function loadCloseTripValidation(
  trip: Trip,
  options?: LoadCloseTripValidationOptions,
): Promise<CloseTripValidationResult> {
  return perfAsync(
    "loadCloseTripValidation",
    async () => {
      const endPending = perfStart("loadCloseTripValidation.pendingDropoff", { tripId: trip.id });
      const pendingPromise = resolvePendingDropoffStudents(trip.id).finally(endPending);

      const endRoster = perfStart("loadCloseTripValidation.roster", { tripId: trip.id });
      const rosterPromise = resolveRosterItemsForClose(trip.id, options?.rosterItems).finally(
        endRoster,
      );

      const [pendingResolution, rosterResolution] = await Promise.all([
        pendingPromise,
        rosterPromise,
      ]);

      const rosterItems = rosterResolution.items;
      let missingPrioritarios: CloseTripStudentRef[] = [];

      if (trip.direction === "retorno") {
        const endHints = perfStart("loadCloseTripValidation.morningHints", {
          tripDate: trip.trip_date,
        });
        const morningRiderIds = await withTimeout(
          getMorningAttendanceHints(trip.trip_date).catch(() => new Set<string>()),
          MORNING_HINTS_TIMEOUT_MS,
          new Set<string>(),
        ).finally(endHints);
        missingPrioritarios = mapPrioritarios(rosterItems, morningRiderIds);
      }

      const connectivityWarning =
        pendingResolution.networkTimedOut || rosterResolution.networkTimedOut
          ? CLOSE_TRIP_CONNECTIVITY_WARNING
          : null;

      return {
        pendingDropoff: mapPendingDropoff(pendingResolution.students),
        missingPrioritarios,
        connectivityWarning,
      };
    },
    { tripId: trip.id, direction: trip.direction },
  );
}
