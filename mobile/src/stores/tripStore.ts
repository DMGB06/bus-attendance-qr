import { useSyncExternalStore } from "react";

import type { Trip } from "@/src/types";

interface TripState {
  activeTrip: Trip | null;
}

interface TripStoreActions {
  setActiveTrip: (trip: Trip) => void;
  clearActiveTrip: () => void;
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

export function useTripStore(): TripState & TripStoreActions {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...snapshot,
    setActiveTrip: (trip) => {
      setState({ activeTrip: trip });
    },
    clearActiveTrip: () => {
      setState({ activeTrip: null });
    },
  };
}
