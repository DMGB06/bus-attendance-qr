import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";

import { useNetworkStatus } from "@/src/core/connectivity/useNetworkStatus";
import { ATTENDANCE_QUEUE_FLUSH_INTERVAL_MS } from "@/src/features/trips/domain/location.constants";
import { loadAttendanceQueue } from "@/src/features/trips/storage/attendance-queue.storage";
import { rosterStoreActions } from "@/src/features/trips/store/rosterStore";
import { useTripStore } from "@/src/features/trips/store/tripStore";

/**
 * Sincroniza la cola offline al recuperar red, al abrir la app y periódicamente
 * mientras hay pendientes (no solo al pasar offline→online).
 */
export function useAttendanceQueueSync(): void {
  const { isConnected } = useNetworkStatus();
  const { activeTrip } = useTripStore();
  const tripId = activeTrip?.id;
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (!tripId || !isConnected) {
      return;
    }

    void rosterStoreActions.syncPendingWrites(tripId);
  }, [isConnected, tripId]);

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
    if (!tripId || !isConnected) {
      return;
    }

    const intervalId = setInterval(() => {
      void loadAttendanceQueue().then((queue) => {
        const pending = queue.filter((entry) => entry.tripId === tripId);
        if (pending.length > 0) {
          void rosterStoreActions.syncPendingWrites(tripId);
        }
      });
    }, ATTENDANCE_QUEUE_FLUSH_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
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
