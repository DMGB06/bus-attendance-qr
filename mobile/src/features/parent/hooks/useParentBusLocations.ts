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
import type { Trip } from "@/src/features/trips/types";

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
      parentChildrenStore.syncActiveTrips(snapshot.activeTripIds, trips);
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
  const hasTripsToFollow = snapshot.activeTripIds.length > 0;

  // Sin viaje activo no hay bus que seguir: los hijos ya se sincronizan en ParentChildrenSync.
  useEffect(() => {
    if (!shouldPoll || !hasTripsToFollow) {
      return;
    }

    const intervalId = setInterval(() => {
      void refreshTripGps();
    }, PARENT_LOCATION_POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [shouldPoll, hasTripsToFollow, refreshTripGps]);

  useEffect(() => {
    if (!tripIdsKey) {
      setRealtimeStatus(null);
      return;
    }

    const channel = supabase.channel(`parent-bus-locations-${tripIdsKey}`);

    for (const tripId of tripIdsKey.split(",")) {
      channel.on<Trip>(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "buscontrol",
          table: "bus_trips",
          filter: `id=eq.${tripId}`,
        },
        // El aviso ya trae la fila: no hace falta otra consulta por cada punto GPS.
        ({ new: trip }) => {
          parentChildrenStore.syncActiveTrips([tripId], trip.status === "active" ? [trip] : []);
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
  }, [tripIdsKey]);

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
