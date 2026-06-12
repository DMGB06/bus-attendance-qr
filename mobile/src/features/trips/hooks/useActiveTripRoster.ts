import { useEffect, useRef } from "react";

import { supabase } from "@/src/core/config/supabase";
import { useAppCapabilities } from "@/src/features/auth/hooks/useAppCapabilities";
import { rosterStoreActions } from "@/src/features/trips/store/rosterStore";
import { useTripStore } from "@/src/features/trips/store/tripStore";

const ASSISTANT_POLL_MS = 10_000;

/**
 * Único dueño de `hydrateTripRoster` — montar una vez bajo `(ops)/(tabs)`.
 * Realtime de asistencia + polling para asistenta sin viaje activo local.
 */
export function useActiveTripRoster(): void {
  const { activeTrip, hydrateActiveTrip } = useTripStore();
  const { capabilities } = useAppCapabilities();
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

  useEffect(() => {
    if (!capabilities.isAssistant || activeTrip) {
      return;
    }

    const intervalId = setInterval(() => {
      void hydrateActiveTrip();
    }, ASSISTANT_POLL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [capabilities.isAssistant, activeTrip, hydrateActiveTrip]);

  useEffect(() => {
    if (!tripId) {
      return;
    }

    const channel = supabase
      .channel(`trip-attendance-${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "buscontrol",
          table: "bus_attendance_records",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          void rosterStoreActions.refreshTripRoster(tripId, {
            silent: true,
            skipQueueFlush: true,
            force: true,
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tripId]);
}
