import { useEffect, useRef } from "react";

import { rosterStoreActions } from "@/src/features/trips/store/rosterStore";
import { useTripStore } from "@/src/features/trips/store/tripStore";

/**
 * Único dueño de `hydrateTripRoster` — montar una vez bajo `(tabs)`.
 * Al cambiar o quitar `activeTrip`, hidrata o limpia el roster store.
 */
export function useActiveTripRoster(): void {
  const { activeTrip } = useTripStore();
  const tripId = activeTrip?.id;
  const previousTripIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!tripId) {
      if (previousTripIdRef.current) {
        rosterStoreActions.clearRosterStore();
      }
      previousTripIdRef.current = undefined;
      return;
    }

    previousTripIdRef.current = tripId;
    void rosterStoreActions.hydrateTripRoster(tripId);
  }, [tripId]);
}
