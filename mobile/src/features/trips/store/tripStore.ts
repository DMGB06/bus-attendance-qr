import { useSyncExternalStore } from "react";

import type { OperationalBusContext } from "@/src/features/trips/services/crew.service";
import { resolveOperatorTripSnapshot } from "@/src/features/trips/services/trips.service";
import type { Trip } from "@/src/features/trips/types";

interface TripState {
  activeTrip: Trip | null;
  operationalContext: OperationalBusContext | null | undefined;
  closeSuccessMessage: string | null;
  isHydrating: boolean;
  hasHydratedOnce: boolean;
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
  operationalContext: undefined,
  closeSuccessMessage: null,
  isHydrating: false,
  hasHydratedOnce: false,
};

let hydrateInFlight: Promise<Trip | null> | null = null;
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
  state = { ...state, ...patch };
  emitChange();
}

function getSnapshot() {
  return state;
}

async function hydrateActiveTrip() {
  if (hydrateInFlight) {
    return hydrateInFlight;
  }

  setState({ isHydrating: true });

  hydrateInFlight = (async () => {
    try {
      const { context, activeTrip } = await resolveOperatorTripSnapshot().catch(() => ({
        context: null,
        activeTrip: null,
      }));

      setState({
        activeTrip,
        operationalContext: context,
        hasHydratedOnce: true,
      });

      return activeTrip;
    } finally {
      setState({ isHydrating: false });
      hydrateInFlight = null;
    }
  })();

  return hydrateInFlight;
}

function setActiveTrip(trip: Trip) {
  setState({ activeTrip: trip });
}

function clearActiveTrip() {
  setState({
    activeTrip: null,
    operationalContext: undefined,
    hasHydratedOnce: false,
  });
  hydrateInFlight = null;
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
  getOperationalContext: () => getSnapshot().operationalContext,
  clearActiveTrip,
  hydrateActiveTrip,
  setCloseSuccessMessage,
  acknowledgeCloseSuccess,
};
