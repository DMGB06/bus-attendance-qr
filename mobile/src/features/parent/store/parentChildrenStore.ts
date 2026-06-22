import { useSyncExternalStore } from "react";

import { getParentChildrenWithStatus } from "@/src/features/parent/services/parent-children.service";
import type { ParentChildSummary } from "@/src/features/parent/types";
import type { Trip } from "@/src/features/trips/types";

type ParentChildrenStoreState = {
  children: ParentChildSummary[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  userId: string | null;
};

type FetchChildrenOptions = {
  silent?: boolean;
  force?: boolean;
};

type Listener = () => void;

const STALE_AFTER_MS = 45_000;

let state: ParentChildrenStoreState = {
  children: [],
  loading: false,
  refreshing: false,
  error: null,
  lastFetchedAt: null,
  userId: null,
};

let inFlight: Promise<ParentChildSummary[]> | null = null;
let inFlightUserId: string | null = null;
const listeners = new Set<Listener>();

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function setState(patch: Partial<ParentChildrenStoreState>) {
  state = { ...state, ...patch };
  emitChange();
}

function getSnapshot(): ParentChildrenStoreState {
  return state;
}

function isFresh(userId: string) {
  return (
    state.userId === userId &&
    state.lastFetchedAt !== null &&
    Date.now() - state.lastFetchedAt < STALE_AFTER_MS
  );
}

async function fetchChildren(
  userId: string,
  options: FetchChildrenOptions = {},
): Promise<ParentChildSummary[]> {
  const silent = options.silent ?? false;
  const force = options.force ?? false;

  if (!force && isFresh(userId) && state.children.length > 0) {
    return state.children;
  }

  if (!force && inFlight && inFlightUserId === userId) {
    return inFlight;
  }

  if (!silent && state.children.length === 0) {
    setState({ loading: true, error: null });
  } else if (!silent) {
    setState({ refreshing: true, error: null });
  }

  const request = getParentChildrenWithStatus(userId)
    .then((children) => {
      setState({
        children,
        userId,
        error: null,
        lastFetchedAt: Date.now(),
        loading: false,
        refreshing: false,
      });
      return children;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Error al cargar hijos.";
      setState({
        error: message,
        loading: false,
        refreshing: false,
      });
      throw error;
    })
    .finally(() => {
      if (inFlight === request) {
        inFlight = null;
        inFlightUserId = null;
      }
    });

  inFlight = request;
  inFlightUserId = userId;
  return request;
}

function getChildById(studentId: string): ParentChildSummary | null {
  return state.children.find((child) => child.student.id === studentId) ?? null;
}

function patchActiveTrips(trips: Trip[]) {
  if (!trips.length || !state.children.length) {
    return;
  }

  const tripMap = new Map(trips.map((trip) => [trip.id, trip]));
  let changed = false;

  const children = state.children.map((child) => {
    const tripId = child.activeTrip?.id;
    if (!tripId) {
      return child;
    }

    const nextTrip = tripMap.get(tripId);
    if (!nextTrip) {
      return child;
    }

    changed = true;
    return {
      ...child,
      activeTrip: nextTrip,
    };
  });

  if (changed) {
    setState({ children, lastFetchedAt: Date.now() });
  }
}

function clearParentChildrenStore() {
  state = {
    children: [],
    loading: false,
    refreshing: false,
    error: null,
    lastFetchedAt: null,
    userId: null,
  };
  inFlight = null;
  inFlightUserId = null;
  emitChange();
}

export function useParentChildrenStore(): ParentChildrenStoreState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const parentChildrenStore = {
  fetchChildren,
  getChildById,
  patchActiveTrips,
  clearParentChildrenStore,
  getSnapshot,
  isFresh,
};
