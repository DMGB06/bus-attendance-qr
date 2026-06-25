import { useEffect, useRef } from "react";

import { supabase } from "@/src/core/config/supabase";
import { useAppCapabilities } from "@/src/features/auth/hooks/useAppCapabilities";
import { rosterStoreActions } from "@/src/features/trips/store/rosterStore";
import { tripStoreActions, useTripStore } from "@/src/features/trips/store/tripStore";
import { useAppForeground } from "@/src/shared/hooks/useAppForeground";

const ASSISTANT_POLL_MS = 10_000;

/**
 * Único dueño de `hydrateTripRoster` — montar una vez bajo `(ops)/(tabs)`.
 * Realtime de asistencia + polling para asistenta sin viaje activo local.
 */
export function useActiveTripRoster(): void {
  const { activeTrip, operationalContext, hydrateActiveTrip } = useTripStore();
  const { capabilities } = useAppCapabilities();
  const isForeground = useAppForeground();
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
    if (!capabilities.isAssistant || activeTrip || !isForeground) {
      return;
    }

    const intervalId = setInterval(() => {
      void hydrateActiveTrip();
    }, ASSISTANT_POLL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [capabilities.isAssistant, activeTrip, hydrateActiveTrip, isForeground]);

  useEffect(() => {
    if (!capabilities.isAssistant || activeTrip) {
      return;
    }

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribeToBusTrips = (busId: string) => {
      if (cancelled) {
        return;
      }

      channel = supabase
        .channel(`assistant-bus-trips-${busId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "buscontrol",
            table: "bus_trips",
            filter: `bus_id=eq.${busId}`,
          },
          () => {
            void hydrateActiveTrip();
          },
        )
        .subscribe();
    };

    const cachedBusId = operationalContext?.busId ?? tripStoreActions.getOperationalContext()?.busId;
    if (cachedBusId) {
      subscribeToBusTrips(cachedBusId);
    } else {
      void hydrateActiveTrip().then(() => {
        const busId = tripStoreActions.getOperationalContext()?.busId;
        if (busId) {
          subscribeToBusTrips(busId);
        }
      });
    }

    return () => {
      cancelled = true;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [capabilities.isAssistant, activeTrip, hydrateActiveTrip, operationalContext?.busId]);

  useEffect(() => {
    if (!capabilities.isAssistant || !activeTrip || !isForeground) {
      return;
    }

    void hydrateActiveTrip();
  }, [capabilities.isAssistant, activeTrip, hydrateActiveTrip, isForeground]);

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
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "buscontrol",
          table: "bus_attendance_records",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          void rosterStoreActions.refreshTripRoster(tripId, {
            silent: true,
            skipQueueFlush: true,
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tripId]);
}
