import { useSyncExternalStore } from "react";

import { getActiveTripByOperator } from "@/src/services/trips";
import type { Trip } from "@/src/types";

interface TripState {
  activeTrip: Trip | null;
}

interface TripStoreActions {
  setActiveTrip: (trip: Trip) => void;
  clearActiveTrip: () => void;
  hydrateActiveTrip: () => Promise<Trip | null>;
}

type Listener = () => void;

let state: TripState = {
  activeTrip: null,
};

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

function setState(patch: Partial<TripState>) {
  state = {
    ...state,
    ...patch,
  };
  emitChange();
}

function getSnapshot() {
  return state;
}

async function hydrateActiveTrip() {
  const activeTrip = await getActiveTripByOperator();
  setState({ activeTrip });
  return activeTrip;
}

function setActiveTrip(trip: Trip) {
  setState({ activeTrip: trip });
}

function clearActiveTrip() {
  setState({ activeTrip: null });
}

export function useTripStore(): TripState & TripStoreActions {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...snapshot,
    setActiveTrip,
    clearActiveTrip,
    hydrateActiveTrip,
  };
}
