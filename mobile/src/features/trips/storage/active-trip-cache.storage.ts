import AsyncStorage from "@react-native-async-storage/async-storage";

import type { OperationalBusContext } from "@/src/features/trips/services/crew.service";
import type { Trip } from "@/src/features/trips/types";
import { getLocalTodayDateIso } from "@/src/shared/utils/local-date";

const KEY = "@buscontrol/active-trip-snapshot";

export type ActiveTripSnapshot = {
  context: OperationalBusContext | null;
  activeTrip: Trip | null;
};

export async function saveActiveTripSnapshot(snapshot: ActiveTripSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    /* cache best-effort */
  }
}

/** Solo sirve el viaje de hoy: uno de otro dia ya no se puede operar. */
export async function loadActiveTripSnapshot(): Promise<ActiveTripSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      return null;
    }
    const snapshot = JSON.parse(raw) as ActiveTripSnapshot;
    if (snapshot.activeTrip && snapshot.activeTrip.trip_date !== getLocalTodayDateIso()) {
      return { context: snapshot.context, activeTrip: null };
    }
    return snapshot;
  } catch {
    return null;
  }
}
