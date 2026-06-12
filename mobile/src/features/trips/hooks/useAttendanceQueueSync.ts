import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";

import { useNetworkStatus } from "@/src/core/connectivity/useNetworkStatus";
import { rosterStoreActions } from "@/src/features/trips/store/rosterStore";
import { useTripStore } from "@/src/features/trips/store/tripStore";

/**
 * Sincroniza la cola offline al recuperar red o volver a primer plano.
 * Montar una vez bajo `(ops)/(tabs)`.
 */
export function useAttendanceQueueSync(): void {
  const { isConnected } = useNetworkStatus();
  const { activeTrip } = useTripStore();
  const tripId = activeTrip?.id;
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (!tripId) {
      wasOfflineRef.current = false;
      return;
    }

    if (!isConnected) {
      wasOfflineRef.current = true;
      return;
    }

    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      void rosterStoreActions.syncPendingWrites(tripId);
    }
  }, [isConnected, tripId]);

  useEffect(() => {
    if (!tripId) {
      return;
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        return;
      }

      void NetInfo.fetch().then((state) => {
        if (state.isConnected) {
          void rosterStoreActions.syncPendingWrites(tripId);
        }
      });
    });

    return () => {
      subscription.remove();
    };
  }, [tripId]);
}
