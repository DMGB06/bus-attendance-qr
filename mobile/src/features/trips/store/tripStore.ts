import { useSyncExternalStore } from "react";

import type { OperationalBusContext } from "@/src/features/trips/services/crew.service";
import { resolveOperatorTripSnapshot } from "@/src/features/trips/services/trips.service";
import {
  loadActiveTripSnapshot,
  saveActiveTripSnapshot,
} from "@/src/features/trips/storage/active-trip-cache.storage";
import type { Trip } from "@/src/features/trips/types";
import { withDeadline } from "@/src/shared/utils/withTimeout";

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
  /** Tras cerrar viaje: quita el activo pero conserva bus/contexto para mostrar "Iniciar viaje". */
  releaseActiveTripAfterClose: () => void;
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

const HYDRATE_TIMEOUT_MS = 5_000;

let hydrateInFlight: Promise<Trip | null> | null = null;
// Sube con cada cambio local del viaje: una hidratacion anterior ya no puede aplicarse.
let tripEpoch = 0;
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

  const isFirstHydrate = !getSnapshot().hasHydratedOnce;
  if (isFirstHydrate) {
    setState({ isHydrating: true });
  }

  const epoch = tripEpoch;
  const current: Promise<Trip | null> = (async () => {
    const snapshot = await withDeadline(resolveOperatorTripSnapshot(), HYDRATE_TIMEOUT_MS).then(
      (fresh) => {
        if (epoch === tripEpoch) {
          void saveActiveTripSnapshot(fresh);
        }
        return fresh;
      },
      // Sin red no se sabe si termino el viaje: se conserva lo ultimo conocido.
      async () => {
        const { activeTrip, operationalContext } = getSnapshot();
        if (activeTrip || operationalContext) {
          return { activeTrip, context: operationalContext ?? null };
        }
        return (await loadActiveTripSnapshot()) ?? { activeTrip: null, context: null };
      },
    );

    if (epoch !== tripEpoch) {
      return getSnapshot().activeTrip;
    }

    setState({
      activeTrip: snapshot.activeTrip,
      operationalContext: snapshot.context,
      hasHydratedOnce: true,
    });

    return snapshot.activeTrip;
  })().finally(() => {
    if (hydrateInFlight === current) {
      hydrateInFlight = null;
      setState({ isHydrating: false });
    }
  });

  hydrateInFlight = current;
  return current;
}

function persistCurrentTrip() {
  const { activeTrip, operationalContext } = getSnapshot();
  void saveActiveTripSnapshot({ activeTrip, context: operationalContext ?? null });
}

function setActiveTrip(trip: Trip) {
  tripEpoch += 1;
  hydrateInFlight = null;
  setState({ activeTrip: trip, isHydrating: false });
  persistCurrentTrip();
}

function forgetActiveTripInMemory() {
  tripEpoch += 1;
  hydrateInFlight = null;
  setState({
    activeTrip: null,
    operationalContext: undefined,
    hasHydratedOnce: false,
    isHydrating: false,
  });
}

function clearActiveTrip() {
  forgetActiveTripInMemory();
  void saveActiveTripSnapshot({ activeTrip: null, context: null });
}

function releaseActiveTripAfterClose() {
  tripEpoch += 1;
  hydrateInFlight = null;
  setState({ activeTrip: null, isHydrating: false });
  persistCurrentTrip();
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
    releaseActiveTripAfterClose,
    hydrateActiveTrip,
    acknowledgeCloseSuccess,
  };
}

export const tripStoreActions = {
  getActiveTripId: () => getSnapshot().activeTrip?.id ?? null,
  getOperationalContext: () => getSnapshot().operationalContext,
  hasHydratedOnce: () => getSnapshot().hasHydratedOnce,
  setActiveTrip,
  forgetActiveTripInMemory,
  clearActiveTrip,
  releaseActiveTripAfterClose,
  hydrateActiveTrip,
  setCloseSuccessMessage,
  acknowledgeCloseSuccess,
};
