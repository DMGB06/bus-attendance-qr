import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { useAppCapabilities } from "@/src/features/auth/hooks/useAppCapabilities";
import { shouldPublishDriverLocation } from "@/src/features/trips/domain/driver-location-publish.rules";
import { TRIP_LOCATION_PUBLISH_INTERVAL_MS } from "@/src/features/trips/domain/location.constants";
import {
  ensureForegroundLocationPermission,
  getBalancedCurrentPosition,
} from "@/src/features/trips/services/location-permissions.service";
import { publishDriverLocation } from "@/src/features/trips/services/trip-location.service";
import { useTripStore } from "@/src/features/trips/store/tripStore";
import { toSafeLogMessage } from "@/src/shared/utils/safe-log";

type UseTripLocationPublisherOptions = {
  /** Nombre de la pestaña activa bajo `(ops)/(tabs)`, p. ej. `scanner`. */
  opsTabName?: string;
};

/**
 * Publica GPS del bus solo para chofer con viaje active, app en primer plano
 * y pestaña operativa (Viaje / Escáner / Lista).
 */
export function useTripLocationPublisher(options?: UseTripLocationPublisherOptions): void {
  const { activeTrip } = useTripStore();
  const { capabilities } = useAppCapabilities();
  const tripId = activeTrip?.status === "active" ? activeTrip.id : undefined;
  const opsTabName = options?.opsTabName;
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const publishingRef = useRef(false);

  const canPublish = shouldPublishDriverLocation({
    isDriver: capabilities.isDriver,
    tripActive: Boolean(tripId),
    appState,
    opsTabName,
  });

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      setAppState(nextState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!canPublish || !tripId) {
      return;
    }

    let cancelled = false;

    async function publishOnce() {
      if (cancelled || publishingRef.current || !tripId) {
        return;
      }

      publishingRef.current = true;

      try {
        const granted = await ensureForegroundLocationPermission();

        if (!granted || cancelled) {
          return;
        }

        const position = await getBalancedCurrentPosition();

        if (cancelled) {
          return;
        }

        await publishDriverLocation({
          tripId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      } catch (error) {
        console.warn("[gps] No se pudo publicar ubicación:", toSafeLogMessage(error));
      } finally {
        publishingRef.current = false;
      }
    }

    void publishOnce();

    const intervalId = setInterval(() => {
      void publishOnce();
    }, TRIP_LOCATION_PUBLISH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [canPublish, tripId]);
}
