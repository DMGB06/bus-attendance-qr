import { useEffect } from "react";

import { tripStoreActions } from "@/src/features/trips/store/tripStore";

/** Asegura hidratación del viaje activo al entrar al panel de operaciones. */
export function OpsTripHydrationSync() {
  useEffect(() => {
    if (tripStoreActions.hasHydratedOnce()) {
      return;
    }

    void tripStoreActions.hydrateActiveTrip();
  }, []);

  return null;
}
