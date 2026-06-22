import { useEffect } from "react";

import { tripStoreActions } from "@/src/features/trips/store/tripStore";

/** Asegura hidratación del viaje activo al entrar al panel de operaciones. */
export function OpsTripHydrationSync() {
  useEffect(() => {
    void tripStoreActions.hydrateActiveTrip();
  }, []);

  return null;
}
