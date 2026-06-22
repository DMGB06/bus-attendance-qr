import { useCallback, useEffect, useRef, useState } from "react";



import { supabase } from "@/src/core/config/supabase";

import { shouldPollParentBusLocations } from "@/src/features/parent/domain/parent-location-sync.rules";

import { getUser } from "@/src/features/auth/services/auth.service";

import { useAppForeground } from "@/src/shared/hooks/useAppForeground";
import { PARENT_LOCATION_POLL_INTERVAL_MS } from "@/src/features/trips/domain/location.constants";

import { getParentBusLocationSnapshot } from "@/src/features/parent/services/parent-bus-location.service";

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

  const [locations, setLocations] = useState<ParentBusLocation[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [hasActiveTrip, setHasActiveTrip] = useState(false);

  const [waitingForGps, setWaitingForGps] = useState(false);

  const [activeTripIds, setActiveTripIds] = useState<string[]>([]);

  const [realtimeStatus, setRealtimeStatus] = useState<string | null>(null);

  const mountedRef = useRef(true);

  const isForeground = useAppForeground();

  const loadLocations = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;



    if (!silent) {

      setLoading(true);

    }



    try {

      const user = await getUser();



      if (!user) {

        throw new Error("Debes iniciar sesión.");

      }



      const snapshot = await getParentBusLocationSnapshot(user.id);



      if (mountedRef.current) {

        setLocations(snapshot.locations);

        setHasActiveTrip(snapshot.hasActiveTrip);

        setWaitingForGps(snapshot.waitingForGps);

        setActiveTripIds(snapshot.activeTripIds);

        setError(null);

      }

    } catch (loadError) {

      if (mountedRef.current) {

        setError(loadError instanceof Error ? loadError.message : "Error al cargar el mapa.");

      }

    } finally {

      if (mountedRef.current) {

        setLoading(false);

        setRefreshing(false);

      }

    }

  }, []);



  const refresh = useCallback(async () => {

    setRefreshing(true);

    await loadLocations({ silent: true });

  }, [loadLocations]);



  useEffect(() => {

    mountedRef.current = true;

    void loadLocations();



    return () => {

      mountedRef.current = false;

    };

  }, [loadLocations]);



  const shouldPoll = shouldPollParentBusLocations(realtimeStatus, isForeground);



  useEffect(() => {

    if (!shouldPoll) {

      return;

    }



    const intervalId = setInterval(() => {

      void loadLocations({ silent: true });

    }, PARENT_LOCATION_POLL_INTERVAL_MS);



    return () => {

      clearInterval(intervalId);

    };

  }, [loadLocations, shouldPoll, isForeground]);



  const tripIdsKey = activeTripIds.join(",");



  useEffect(() => {

    if (!activeTripIds.length) {

      setRealtimeStatus(null);

      return;

    }



    const channel = supabase.channel(`parent-bus-locations-${tripIdsKey}`);



    for (const tripId of activeTripIds) {

      channel.on(

        "postgres_changes",

        {

          event: "UPDATE",

          schema: "buscontrol",

          table: "bus_trips",

          filter: `id=eq.${tripId}`,

        },

        () => {

          void loadLocations({ silent: true });

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

  }, [tripIdsKey, loadLocations, activeTripIds]);



  return {

    locations,

    loading,

    refreshing,

    error,

    hasActiveTrip,

    waitingForGps,

    refresh,

  };

}


