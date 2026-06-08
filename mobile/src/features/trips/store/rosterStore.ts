import { useSyncExternalStore } from "react";

import { patchRosterItemsForEvent } from "@/src/features/trips/domain/trip-roster.optimistic";
import {
  applyOptimisticRegistration,
  flushAttendanceQueue,
  refreshRosterFromNetwork,
  syncAttendanceToServer,
  validateRegistration,
} from "@/src/features/trips/services/attendance-registration.service";
import {
  loadCachedRosterSnapshot,
  saveCachedRosterSnapshot,
} from "@/src/features/trips/storage/roster-cache.storage";
import { countPendingForTrip } from "@/src/features/trips/storage/attendance-queue.storage";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";
import type { AttendanceEventType } from "@/src/features/trips/types";

type RosterStoreState = {
  tripId: string | null;
  items: TripRosterItem[];
  isHydrating: boolean;
  isRefreshing: boolean;
  isShowingCache: boolean;
  cacheSavedAt: string | null;
  pendingSyncCount: number;
  errorMessage: string | null;
};

type Listener = () => void;

const listeners = new Set<Listener>();

let state: RosterStoreState = {
  tripId: null,
  items: [],
  isHydrating: false,
  isRefreshing: false,
  isShowingCache: false,
  cacheSavedAt: null,
  pendingSyncCount: 0,
  errorMessage: null,
};

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function setState(patch: Partial<RosterStoreState>) {
  state = { ...state, ...patch };
  emitChange();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): RosterStoreState {
  return state;
}

async function updatePendingSyncCount(tripId: string) {
  const pendingSyncCount = await countPendingForTrip(tripId);
  setState({ pendingSyncCount });
}

async function hydrateTripRoster(tripId: string): Promise<void> {
  if (state.tripId !== tripId) {
    setState({
      tripId,
      items: [],
      isHydrating: true,
      isShowingCache: false,
      cacheSavedAt: null,
      errorMessage: null,
    });
  } else {
    setState({ isHydrating: true, errorMessage: null });
  }

  const cached = await loadCachedRosterSnapshot(tripId);
  if (cached?.items.length) {
    setState({
      items: cached.items,
      isShowingCache: true,
      cacheSavedAt: cached.savedAt,
      isHydrating: false,
    });
  }

  void refreshTripRoster(tripId, { silent: Boolean(cached?.items.length) });
}

async function refreshTripRoster(
  tripId: string,
  options?: { silent?: boolean },
): Promise<void> {
  const silent = options?.silent ?? false;

  if (!silent) {
    setState({ isRefreshing: true, errorMessage: null });
  }

  try {
    const result = await refreshRosterFromNetwork(tripId);
    setState({
      tripId,
      items: result.items,
      isShowingCache: result.fromCache,
      cacheSavedAt: result.cacheSavedAt,
      errorMessage: null,
    });
    await updatePendingSyncCount(tripId);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "No se pudo cargar la lista de asistencia.";
    if (!state.items.length) {
      setState({ errorMessage: message });
    }
  } finally {
    setState({ isHydrating: false, isRefreshing: false });
  }
}

function clearRosterStore() {
  setState({
    tripId: null,
    items: [],
    isHydrating: false,
    isRefreshing: false,
    isShowingCache: false,
    cacheSavedAt: null,
    pendingSyncCount: 0,
    errorMessage: null,
  });
}

function getRegistrationValidationError(
  studentId: string,
  eventType: AttendanceEventType,
): string | null {
  if (!state.tripId) {
    return "No hay viaje activo.";
  }
  return validateRegistration(state.items, studentId, eventType);
}

async function registerStudentAttendance(
  tripId: string,
  studentId: string,
  eventType: AttendanceEventType,
): Promise<{ synced: boolean; queued: boolean; duplicate: boolean }> {
  const validationError = validateRegistration(state.items, studentId, eventType);
  if (validationError) {
    throw new Error(validationError);
  }

  const previousItems = state.items;
  const optimisticItems = patchRosterItemsForEvent(previousItems, tripId, studentId, eventType);
  setState({ items: optimisticItems, errorMessage: null });
  void saveCachedRosterSnapshot(tripId, optimisticItems);
  void applyOptimisticRegistration(tripId, studentId, eventType, previousItems).catch(() => {
    /* cache persistence is best-effort */
  });

  try {
    const result = await syncAttendanceToServer(tripId, studentId, eventType);

    if (result.status === "queued") {
      await updatePendingSyncCount(tripId);
      return { synced: false, queued: true, duplicate: false };
    }

    if (result.status === "duplicate") {
      await refreshTripRoster(tripId, { silent: true });
      return { synced: true, queued: false, duplicate: true };
    }

    void refreshTripRoster(tripId, { silent: true });
    return { synced: true, queued: false, duplicate: false };
  } catch (error: unknown) {
    await refreshTripRoster(tripId, { silent: true });
    throw error;
  }
}

async function syncPendingWrites(tripId: string): Promise<void> {
  await flushAttendanceQueue(tripId);
  await refreshTripRoster(tripId, { silent: true });
}

export function useRosterStore(): RosterStoreState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getRosterSnapshot(): RosterStoreState {
  return getSnapshot();
}

export const rosterStoreActions = {
  hydrateTripRoster,
  refreshTripRoster,
  clearRosterStore,
  registerStudentAttendance,
  getRegistrationValidationError,
  syncPendingWrites,
};
