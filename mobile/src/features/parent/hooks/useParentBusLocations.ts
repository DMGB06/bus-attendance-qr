import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/src/core/config/supabase";
import { shouldPollParentBusLocations } from "@/src/features/parent/domain/parent-location-sync.rules";
import { buildBusLocationSnapshotFromChildren } from "@/src/features/parent/services/parent-bus-location.service";
import { fetchActiveTripGpsByIds } from "@/src/features/parent/services/parent-trip-gps.service";
import {
  parentChildrenStore,
  useParentChildrenStore,
} from "@/src/features/parent/store/parentChildrenStore";
import { getUser } from "@/src/features/auth/services/auth.service";
import { useAppForeground } from "@/src/shared/hooks/useAppForeground";
import { PARENT_LOCATION_POLL_INTERVAL_MS } from "@/src/features/trips/domain/location.constants";
import type { ParentBusLocation } from "@/src/features/parent/types/bus-location";

type ParentBusLocationsState = {
  locations: ParentBusLocation[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  hasActiveTrip: boolean;
  waitingForGps: boolean;
  refresh: () => Promise<void>;
};

export function useParentBusLocations(): ParentBusLocationsState {
  const store = useParentChildrenStore();
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const userIdRef = useRef<string | null>(null);
  const isForeground = useAppForeground();

  const snapshot = useMemo(
    () => buildBusLocationSnapshotFromChildren(store.children),
    [store.children],
  );

  const ensureChildrenLoaded = useCallback(async (options?: { silent?: boolean; force?: boolean }) => {
    const user = userIdRef.current ?? (await getUser())?.id ?? null;
    if (!user) {
      throw new Error("Debes iniciar sesión.");
    }

    userIdRef.current = user;
    await parentChildrenStore.fetchChildren(user, {
      silent: options?.silent ?? false,
      force: options?.force ?? false,
    });
  }, []);

  const refreshTripGps = useCallback(async () => {
    if (!snapshot.activeTripIds.length) {
      return;
    }

    try {
      const trips = await fetchActiveTripGpsByIds(snapshot.activeTripIds);
      parentChildrenStore.patchActiveTrips(trips);
      if (mountedRef.current) {
        setError(null);
      }
    } catch (loadError) {
      if (mountedRef.current) {
        setError(loadError instanceof Error ? loadError.message : "Error al actualizar el mapa.");
      }
    }
  }, [snapshot.activeTripIds]);

  const refresh = useCallback(async () => {
    try {
      await ensureChildrenLoaded({ silent: true, force: true });
      await refreshTripGps();
    } catch (loadError) {
      if (mountedRef.current) {
        setError(loadError instanceof Error ? loadError.message : "Error al cargar el mapa.");
      }
    }
  }, [ensureChildrenLoaded, refreshTripGps]);

  useEffect(() => {
    mountedRef.current = true;

    void (async () => {
      try {
        await ensureChildrenLoaded();
      } catch (loadError) {
        if (mountedRef.current) {
          setError(loadError instanceof Error ? loadError.message : "Error al cargar el mapa.");
        }
      }
    })();

    return () => {
      mountedRef.current = false;
    };
  }, [ensureChildrenLoaded]);

  const shouldPoll = shouldPollParentBusLocations(realtimeStatus, isForeground);
  const tripIdsKey = snapshot.activeTripIds.join(",");

  useEffect(() => {
    if (!shouldPoll) {
      return;
    }

    const intervalId = setInterval(() => {
      if (snapshot.activeTripIds.length) {
        void refreshTripGps();
        return;
      }

      void ensureChildrenLoaded({ silent: true, force: true });
    }, PARENT_LOCATION_POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [shouldPoll, isForeground, snapshot.activeTripIds.length, refreshTripGps, ensureChildrenLoaded]);

  useEffect(() => {
    if (!snapshot.activeTripIds.length) {
      setRealtimeStatus(null);
      return;
    }

    const channel = supabase.channel(`parent-bus-locations-${tripIdsKey}`);

    for (const tripId of snapshot.activeTripIds) {
      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "buscontrol",
          table: "bus_trips",
          filter: `id=eq.${tripId}`,
        },
        () => {
          void refreshTripGps();
        },
      );
    }

    channel.subscribe((status) => {
      if (mountedRef.current) {
        setRealtimeStatus(status);
      }
    });

    return () => {
      setRealtimeStatus(null);
      void supabase.removeChannel(channel);
    };
  }, [tripIdsKey, snapshot.activeTripIds, refreshTripGps]);

  return {
    locations: snapshot.locations,
    loading: store.loading && store.children.length === 0,
    refreshing: store.refreshing,
    error: error ?? store.error,
    hasActiveTrip: snapshot.hasActiveTrip,
    waitingForGps: snapshot.waitingForGps,
    refresh,
  };
}
