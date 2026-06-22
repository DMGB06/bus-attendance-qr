import { useSyncExternalStore } from "react";

import { getActiveTripForCurrentUser } from "@/src/features/trips/services/trips.service";
import type { Trip } from "@/src/features/trips/types";

interface TripState {
  activeTrip: Trip | null;
  closeSuccessMessage: string | null;
}

interface TripStoreActions {
  setActiveTrip: (trip: Trip) => void;
  clearActiveTrip: () => void;
  hydrateActiveTrip: () => Promise<Trip | null>;
  acknowledgeCloseSuccess: () => void;
}

type Listener = () => void;

let state: TripState = {
  activeTrip: null,
  closeSuccessMessage: null,
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
  const activeTrip = await getActiveTripForCurrentUser();
  setState({ activeTrip });
  return activeTrip;
}

function setActiveTrip(trip: Trip) {
  setState({ activeTrip: trip });
}

function clearActiveTrip() {
  setState({ activeTrip: null });
}

function setCloseSuccessMessage(message: string | null) {
  setState({ closeSuccessMessage: message });
}

function acknowledgeCloseSuccess() {
  setState({ closeSuccessMessage: null });
}

export function useTripStore(): TripState & TripStoreActions {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...snapshot,
    setActiveTrip,
    clearActiveTrip,
    hydrateActiveTrip,
    acknowledgeCloseSuccess,
  };
}

export const tripStoreActions = {
  getActiveTripId: () => getSnapshot().activeTrip?.id ?? null,
  clearActiveTrip,
  setCloseSuccessMessage,
  acknowledgeCloseSuccess,
};
