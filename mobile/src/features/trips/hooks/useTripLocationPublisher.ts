import { useEffect, useRef } from "react";

import { useAppCapabilities } from "@/src/features/auth/hooks/useAppCapabilities";
import { TRIP_LOCATION_PUBLISH_INTERVAL_MS } from "@/src/features/trips/domain/location.constants";
import {
  ensureForegroundLocationPermission,
  getBalancedCurrentPosition,
} from "@/src/features/trips/services/location-permissions.service";
import { publishDriverLocation } from "@/src/features/trips/services/trip-location.service";
import { useTripStore } from "@/src/features/trips/store/tripStore";
import { toSafeLogMessage } from "@/src/shared/utils/safe-log";

/**
 * Publica GPS del bus solo para chofer con viaje active.
 * Montar una vez bajo `(ops)/(tabs)`.
 */
export function useTripLocationPublisher(): void {
  const { activeTrip } = useTripStore();
  const { capabilities } = useAppCapabilities();
  const tripId = activeTrip?.status === "active" ? activeTrip.id : undefined;
  const shouldPublish = capabilities.isDriver && Boolean(tripId);
  const publishingRef = useRef(false);

  useEffect(() => {
    if (!shouldPublish || !tripId) {
      return;
    }

    let cancelled = false;

    async function publishOnce() {
      if (cancelled || publishingRef.current) {
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
  }, [shouldPublish, tripId]);
}
