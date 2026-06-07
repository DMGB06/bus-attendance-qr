import { useCallback, useState } from "react";
import { useRouter } from "expo-router";

import { getErrorMessage } from "@/src/shared/utils/errors";
import { getPendingDropoffStudents } from "@/src/features/trips/services/attendance.service";
import { closeTrip } from "@/src/features/trips/services/trips.service";
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

    setIsClosing(true);
    setErrorMessage(null);

    try {
      const pendingDropoffStudents = await getPendingDropoffStudents(activeTrip.id);

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

      await closeTrip(activeTrip.id);
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
}
