import { clearAttendanceQueue } from "@/src/features/trips/storage/attendance-queue.storage";
import {
  clearTripRosterCache,
  invalidateCachedStudents,
} from "@/src/features/trips/storage/roster-cache.storage";

/** Limpia estado local para cambiar de cuenta sin borrar datos de Expo Go. */
export async function clearLocalSessionData(): Promise<void> {
  const { tripStoreActions } = await import("@/src/features/trips/store/tripStore");
  const { rosterStoreActions } = await import("@/src/features/trips/store/rosterStore");

  const activeTripId = tripStoreActions.getActiveTripId();

  rosterStoreActions.clearRosterStore();
  tripStoreActions.clearActiveTrip();

  await Promise.all([
    clearAttendanceQueue(),
    invalidateCachedStudents(),
    activeTripId ? clearTripRosterCache(activeTripId) : Promise.resolve(),
  ]);
}
