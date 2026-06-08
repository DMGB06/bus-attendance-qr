import { useCallback, useState } from "react";
import { useRouter } from "expo-router";

import { getErrorMessage } from "@/src/shared/utils/errors";
import {
  cleanupTripAfterClose,
  flushPendingAttendanceForClose,
  resolvePendingDropoffStudents,
} from "@/src/features/trips/services/close-trip.service";
import { closeTrip } from "@/src/features/trips/services/trips.service";
import { rosterStoreActions } from "@/src/features/trips/store/rosterStore";
import { useTripStore } from "@/src/features/trips/store/tripStore";
import { confirmCloseWithPendingStudents } from "@/src/features/trips/utils/rosterConfirmations";

export function useCloseTrip() {
  const router = useRouter();
  const { activeTrip, clearActiveTrip } = useTripStore();
  const [isClosing, setIsClosing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCloseTrip = useCallback(async () => {
    if (!activeTrip) {
      setErrorMessage("No hay viaje activo para cerrar.");
      return;
    }

    const tripId = activeTrip.id;
    setErrorMessage(null);
    setIsClosing(true);

    try {
      const pendingDropoffStudents = await resolvePendingDropoffStudents(tripId);

      if (pendingDropoffStudents.length > 0) {
        const firstStudents = pendingDropoffStudents
          .slice(0, 5)
          .map((student) => student.nombre_alumno);
        const shouldClose = await confirmCloseWithPendingStudents(
          firstStudents,
          pendingDropoffStudents.length,
        );

        if (!shouldClose) {
          return;
        }
      }

      try {
        await flushPendingAttendanceForClose(tripId);
      } catch {
        /* Si la cola offline falla, igual intentamos cerrar el viaje en servidor. */
      }

      await closeTrip(tripId);

      rosterStoreActions.clearRosterStore();
      await cleanupTripAfterClose(tripId);
      clearActiveTrip();
      router.replace("/(tabs)/trip");
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "No se pudo cerrar el viaje."));
    } finally {
      setIsClosing(false);
    }
  }, [activeTrip, clearActiveTrip, router]);

  return {
    activeTrip,
    isClosing,
    errorMessage,
    handleCloseTrip,
  };
};
