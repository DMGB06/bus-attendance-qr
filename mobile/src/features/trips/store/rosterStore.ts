import { useSyncExternalStore } from "react";
import { InteractionManager } from "react-native";

import { perfStart } from "@/src/shared/utils/perfMark";
import { patchRosterItemsForBulkDropoff, patchRosterItemsForEvent } from "@/src/features/trips/domain/trip-roster.optimistic";
import {
  applyOptimisticBulkDropoff,
  applyOptimisticRegistration,
  collectBulkDropoffTargets,
  flushAttendanceQueue,
  refreshRosterFromNetwork,
  syncBulkDropoffToServer,
  syncAttendanceToServer,
  undoPendingRegistration as undoPendingRegistrationService,
  validateRegistration,
} from "@/src/features/trips/services/attendance-registration.service";
import { voidAttendanceRecord } from "@/src/features/trips/services/attendance.service";
import {
  isStudentsCacheFresh,
  loadCachedRosterSnapshot,
  loadCachedStudents,
  saveCachedRosterSnapshot,
} from "@/src/features/trips/storage/roster-cache.storage";
import { countPendingForTrip } from "@/src/features/trips/storage/attendance-queue.storage";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";
import type { AttendanceEventType } from "@/src/features/trips/types";

export type RosterItemStats = {
  onboardCount: number;
  pendingCount: number;
  attendedCount: number;
  completedCount: number;
  totalCount: number;
};

export type RosterMetaSnapshot = {
  isHydrating: boolean;
  isRefreshing: boolean;
  isShowingCache: boolean;
  cacheSavedAt: string | null;
  pendingSyncCount: number;
  errorMessage: string | null;
};

type RosterStoreState = {
  tripId: string | null;
  items: TripRosterItem[];
  itemStats: RosterItemStats;
  isHydrating: boolean;
  isRefreshing: boolean;
  isShowingCache: boolean;
  cacheSavedAt: string | null;
  pendingSyncCount: number;
  errorMessage: string | null;
};

type Listener = () => void;

const REFRESH_COOLDOWN_MS = 45_000;
const EMPTY_ITEMS: TripRosterItem[] = [];
const EMPTY_ITEM_STATS: RosterItemStats = {
  onboardCount: 0,
  pendingCount: 0,
  attendedCount: 0,
  completedCount: 0,
  totalCount: 0,
};
const EMPTY_META: RosterMetaSnapshot = {
  isHydrating: false,
  isRefreshing: false,
  isShowingCache: false,
  cacheSavedAt: null,
  pendingSyncCount: 0,
  errorMessage: null,
};

let metaSnapshotCache: { tripId: string; meta: RosterMetaSnapshot } | null = null;

const listeners = new Set<Listener>();
const lastRefreshAtByTrip = new Map<string, number>();
const hydrateInFlightByTrip = new Map<string, Promise<void>>();
const refreshInFlightByTrip = new Map<string, Promise<void>>();

let state: RosterStoreState = {
  tripId: null,
  items: [],
  itemStats: EMPTY_ITEM_STATS,
  isHydrating: false,
  isRefreshing: false,
  isShowingCache: false,
  cacheSavedAt: null,
  pendingSyncCount: 0,
  errorMessage: null,
};

function computeItemStats(items: TripRosterItem[]): RosterItemStats {
  let onboardCount = 0;
  let pendingCount = 0;
  let attendedCount = 0;
  let completedCount = 0;

  for (const item of items) {
    if (item.status === "onboard") {
      onboardCount += 1;
    } else if (item.status === "pending") {
      pendingCount += 1;
    } else if (item.status === "completed") {
      completedCount += 1;
    }
    if (item.hasAttendance) {
      attendedCount += 1;
    }
  }

  return {
    onboardCount,
    pendingCount,
    attendedCount,
    completedCount,
    totalCount: items.length,
  };
}

function emitChange() {
  metaSnapshotCache = null;
  for (const listener of listeners) {
    listener();
  }
}

function setState(patch: Partial<RosterStoreState>) {
  const next: RosterStoreState = { ...state, ...patch };
  if (patch.items !== undefined) {
    next.itemStats = computeItemStats(patch.items);
  }
  state = next;
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

/**
 * Refresh del roster:
 * - `silent: true` — tras escaneo/bulk; respeta cooldown 45s salvo `force`.
 *   Si padrón cache < 24 h → solo asistencia (`getTripAttendanceOnly`).
 * - `silent: false` — carga visible / sin cache → padrón + asistencia completos.
 * - `force: true` — pull-to-refresh; siempre padrón + asistencia.
 * - Peticiones en vuelo se deduplican por `tripId`.
 */
async function hydrateTripRoster(tripId: string, options?: { force?: boolean }): Promise<void> {
  const force = options?.force ?? false;

  if (!force) {
    const inFlight = hydrateInFlightByTrip.get(tripId);
    if (inFlight) {
      return inFlight;
    }
  }

  const run = hydrateTripRosterInternal(tripId, force);
  if (!force) {
    hydrateInFlightByTrip.set(tripId, run);
    void run.finally(() => {
      if (hydrateInFlightByTrip.get(tripId) === run) {
        hydrateInFlightByTrip.delete(tripId);
      }
    });
  }
  return run;
}

async function hydrateTripRosterInternal(tripId: string, force: boolean): Promise<void> {
  const endHydrate = perfStart("hydrateTripRoster", { tripId });
  const alreadyLoaded = state.tripId === tripId && state.items.length > 0;

  if (alreadyLoaded && !force) {
    void updatePendingSyncCount(tripId);
    endHydrate();
    return;
  }

  if (state.tripId !== tripId) {
    setState({
      tripId,
      items: [],
      itemStats: EMPTY_ITEM_STATS,
      isHydrating: true,
      isShowingCache: false,
      cacheSavedAt: null,
      errorMessage: null,
    });
  } else if (!alreadyLoaded) {
    setState({ isHydrating: true, errorMessage: null });
  }

  const endCacheLoad = perfStart("hydrateTripRoster.cacheLoad", { tripId });
  const [cached, cachedStudents] = await Promise.all([
    loadCachedRosterSnapshot(tripId),
    loadCachedStudents(),
  ]);
  endCacheLoad();
  if (cached?.items.length) {
    setState({
      items: cached.items,
      isShowingCache: true,
      cacheSavedAt: cached.savedAt,
      isHydrating: false,
    });
  }

  const canUseLightNetworkRefresh =
    Boolean(cached?.items.length || alreadyLoaded) ||
    Boolean(cachedStudents?.students.length && isStudentsCacheFresh(cachedStudents.savedAt));

  void InteractionManager.runAfterInteractions(() => {
    void refreshTripRoster(tripId, {
      silent: canUseLightNetworkRefresh,
      skipQueueFlush: alreadyLoaded,
    });
  });
  endHydrate();
}

async function refreshTripRoster(
  tripId: string,
  options?: { silent?: boolean; skipQueueFlush?: boolean; force?: boolean },
): Promise<void> {
  const silent = options?.silent ?? false;
  const force = options?.force ?? false;

  if (silent && !force && state.tripId === tripId && state.items.length > 0) {
    const lastRefreshAt = lastRefreshAtByTrip.get(tripId) ?? 0;
    if (Date.now() - lastRefreshAt < REFRESH_COOLDOWN_MS) {
      return;
    }
  }

  const inFlight = refreshInFlightByTrip.get(tripId);
  if (inFlight) {
    return inFlight;
  }

  const run = refreshTripRosterInternal(tripId, {
    silent,
    skipQueueFlush: options?.skipQueueFlush,
    force,
  });
  refreshInFlightByTrip.set(tripId, run);
  void run.finally(() => {
    if (refreshInFlightByTrip.get(tripId) === run) {
      refreshInFlightByTrip.delete(tripId);
    }
  });
  return run;
}

async function refreshTripRosterInternal(
  tripId: string,
  options: { silent: boolean; skipQueueFlush?: boolean; force: boolean },
): Promise<void> {
  const { silent, force } = options;

  if (!silent) {
    setState({ isRefreshing: true, errorMessage: null });
  }

  const endRefresh = perfStart("refreshTripRoster", { tripId, silent, force });

  try {
    const result = await refreshRosterFromNetwork(tripId, {
      skipQueueFlush: options.skipQueueFlush,
      forceFullSync: force || !silent,
    });
    setState({
      tripId,
      items: result.items,
      isShowingCache: result.fromCache,
      cacheSavedAt: result.cacheSavedAt,
      errorMessage: null,
    });
    lastRefreshAtByTrip.set(tripId, Date.now());
    await updatePendingSyncCount(tripId);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "No se pudo cargar la lista de asistencia.";
    if (!state.items.length) {
      setState({ errorMessage: message });
    }
  } finally {
    endRefresh();
    setState({ isHydrating: false, isRefreshing: false });
  }
}

function clearRosterStore() {
  lastRefreshAtByTrip.clear();
  hydrateInFlightByTrip.clear();
  refreshInFlightByTrip.clear();
  setState({
    tripId: null,
    items: [],
    itemStats: EMPTY_ITEM_STATS,
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

    return { synced: true, queued: false, duplicate: false };
  } catch (error: unknown) {
    await refreshTripRoster(tripId, { silent: true });
    throw error;
  }
}

async function bulkRegisterDropoff(
  tripId: string,
  studentIds?: string[],
): Promise<{ count: number; queued: boolean; failedCount: number }> {
  await flushAttendanceQueue(tripId);
  await refreshTripRoster(tripId, { silent: true });

  const { eligible } = collectBulkDropoffTargets(state.items, studentIds);

  if (eligible.length === 0) {
    throw new Error("No hay alumnos a bordo para registrar la bajada.");
  }

  const previousItems = state.items;
  const optimisticItems = patchRosterItemsForBulkDropoff(previousItems, tripId, eligible);
  setState({ items: optimisticItems, errorMessage: null });
  void saveCachedRosterSnapshot(tripId, optimisticItems);

  try {
    await applyOptimisticBulkDropoff(tripId, eligible, previousItems);
  } catch {
    /* cache persistence is best-effort */
  }

  try {
    const { queuedCount, failedCount } = await syncBulkDropoffToServer(tripId, eligible);
    await updatePendingSyncCount(tripId);
    await refreshTripRoster(tripId, { silent: true });

    if (failedCount > 0) {
      const registered = eligible.length - failedCount;
      throw new Error(
        `Se registraron ${registered} de ${eligible.length}. ${failedCount} alumno(s) siguen a bordo — revísalos en la lista.`,
      );
    }

    return { count: eligible.length, queued: queuedCount > 0, failedCount: 0 };
  } catch (error: unknown) {
    await refreshTripRoster(tripId, { silent: true });
    throw error;
  }
}

async function syncPendingWrites(tripId: string): Promise<void> {
  await flushAttendanceQueue(tripId);
  await refreshTripRoster(tripId, { silent: true });
}

async function undoPendingRegistration(
  tripId: string,
  studentId: string,
  eventType: AttendanceEventType,
): Promise<void> {
  const items = await undoPendingRegistrationService(tripId, studentId, eventType);
  setState({ tripId, items, errorMessage: null });
  await updatePendingSyncCount(tripId);
}

async function voidStudentAttendance(tripId: string, recordId: string, reason: string): Promise<void> {
  await voidAttendanceRecord(recordId, reason);
  await refreshTripRoster(tripId, { force: true, silent: true });
}

/** Metadatos del roster (loading, refresh, sync) sin suscribirse a `items`. */
export function useRosterMeta(tripId: string | undefined): RosterMetaSnapshot {
  const getMetaSnapshot = () => getRosterMetaSnapshot(tripId);
  return useSyncExternalStore(subscribe, getMetaSnapshot, getMetaSnapshot);
}

/** Contadores precalculados del roster completo (sin filtros de nivel/vista). */
export function useRosterItemStats(tripId: string | undefined): RosterItemStats {
  const getStatsSnapshot = () => {
    const snapshot = getSnapshot();
    if (!tripId || snapshot.tripId !== tripId) {
      return EMPTY_ITEM_STATS;
    }
    return snapshot.itemStats;
  };

  return useSyncExternalStore(subscribe, getStatsSnapshot, getStatsSnapshot);
}

function getRosterMetaSnapshot(tripId: string | undefined): RosterMetaSnapshot {
  if (!tripId) {
    return EMPTY_META;
  }

  const snapshot = getSnapshot();
  if (snapshot.tripId !== tripId) {
    return EMPTY_META;
  }

  const cached = metaSnapshotCache;
  if (
    cached?.tripId === tripId &&
    cached.meta.isHydrating === snapshot.isHydrating &&
    cached.meta.isRefreshing === snapshot.isRefreshing &&
    cached.meta.isShowingCache === snapshot.isShowingCache &&
    cached.meta.cacheSavedAt === snapshot.cacheSavedAt &&
    cached.meta.pendingSyncCount === snapshot.pendingSyncCount &&
    cached.meta.errorMessage === snapshot.errorMessage
  ) {
    return cached.meta;
  }

  const meta: RosterMetaSnapshot = {
    isHydrating: snapshot.isHydrating,
    isRefreshing: snapshot.isRefreshing,
    isShowingCache: snapshot.isShowingCache,
    cacheSavedAt: snapshot.cacheSavedAt,
    pendingSyncCount: snapshot.pendingSyncCount,
    errorMessage: snapshot.errorMessage,
  };
  metaSnapshotCache = { tripId, meta };
  return meta;
}

export function useRosterStore(): RosterStoreState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Solo re-renderiza cuando cambia la lista de alumnos del viaje activo. */
export function useRosterItems(tripId: string | undefined): TripRosterItem[] {
  const getItemsSnapshot = () => {
    const snapshot = getSnapshot();
    if (!tripId || snapshot.tripId !== tripId) {
      return EMPTY_ITEMS;
    }
    return snapshot.items;
  };

  return useSyncExternalStore(subscribe, getItemsSnapshot, getItemsSnapshot);
}

export function getRosterSnapshot(): RosterStoreState {
  return getSnapshot();
}

export const rosterStoreActions = {
  hydrateTripRoster,
  refreshTripRoster,
  clearRosterStore,
  registerStudentAttendance,
  bulkRegisterDropoff,
  getRegistrationValidationError,
  syncPendingWrites,
  undoPendingRegistration,
  voidStudentAttendance,
};
