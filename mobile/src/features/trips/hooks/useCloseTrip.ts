import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";

import { OPS_ROUTES } from "@/src/core/routes";

import {
  hasPendingDropoffIssues,
  type CloseTripValidationResult,
} from "@/src/features/trips/domain/close-trip-validation";
import { getErrorMessage } from "@/src/shared/utils/errors";
import {
  cleanupTripAfterClose,
  flushPendingAttendanceForClose,
} from "@/src/features/trips/services/close-trip.service";
import { loadCloseTripValidation } from "@/src/features/trips/services/close-trip-validation.service";
import { closeTrip } from "@/src/features/trips/services/trips.service";
import { rosterStoreActions, useRosterItems } from "@/src/features/trips/store/rosterStore";
import { useTripStore } from "@/src/features/trips/store/tripStore";
import {
  confirmCloseWithPendingStudents,
  confirmCloseWithPendingSync,
} from "@/src/features/trips/utils/rosterConfirmations";
import { countPendingForTrip } from "@/src/features/trips/storage/attendance-queue.storage";

const EMPTY_VALIDATION: CloseTripValidationResult = {
  pendingDropoff: [],
  missingPrioritarios: [],
  connectivityWarning: null,
};

export function useCloseTrip() {
  const router = useRouter();
  const { activeTrip, clearActiveTrip } = useTripStore();
  const rosterItems = useRosterItems(activeTrip?.id);
  const rosterItemsForValidation = useMemo(
    () => (rosterItems.length > 0 ? rosterItems : undefined),
    [rosterItems],
  );
  const [isClosing, setIsClosing] = useState(false);
  const [isLoadingValidation, setIsLoadingValidation] = useState(false);
  const [validation, setValidation] = useState<CloseTripValidationResult>(EMPTY_VALIDATION);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const reloadValidation = useCallback(async () => {
    if (!activeTrip) {
      setValidation(EMPTY_VALIDATION);
      setValidationError(null);
      return;
    }

    setIsLoadingValidation(true);
    setValidationError(null);

    try {
      const nextValidation = await loadCloseTripValidation(activeTrip, {
        rosterItems: rosterItemsForValidation,
      });
      setValidation(nextValidation);
    } catch (error: unknown) {
      setValidation(EMPTY_VALIDATION);
      setValidationError(
        getErrorMessage(error, "No se pudo verificar el estado de los alumnos."),
      );
    } finally {
      setIsLoadingValidation(false);
    }
  }, [activeTrip, rosterItemsForValidation]);

  useEffect(() => {
    void reloadValidation();
  }, [reloadValidation]);

  const handleCloseTrip = useCallback(async () => {
    if (!activeTrip) {
      setErrorMessage("No hay viaje activo para cerrar.");
      return;
    }

    const tripId = activeTrip.id;
    setErrorMessage(null);
    setIsClosing(true);

    try {
      const latestValidation = await loadCloseTripValidation(activeTrip, {
        rosterItems: rosterItemsForValidation,
      });
      setValidation(latestValidation);

      if (hasPendingDropoffIssues(latestValidation)) {
        const shouldClose = await confirmCloseWithPendingStudents(
          latestValidation.pendingDropoff,
          latestValidation.pendingDropoff.length,
          activeTrip.direction,
        );

        if (!shouldClose) {
          return;
        }
      }

      try {
        await flushPendingAttendanceForClose(tripId);
      } catch {
        /* Si la cola offline falla, pedimos confirmación antes de cerrar. */
      }

      const pendingSyncCount = await countPendingForTrip(tripId);
      if (pendingSyncCount > 0) {
        const shouldCloseWithPendingSync = await confirmCloseWithPendingSync(pendingSyncCount);
        if (!shouldCloseWithPendingSync) {
          return;
        }
      }

      await closeTrip(tripId);

      rosterStoreActions.clearRosterStore();
      await cleanupTripAfterClose(tripId);
      clearActiveTrip();
      router.replace(OPS_ROUTES.trip);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "No se pudo cerrar el viaje."));
    } finally {
      setIsClosing(false);
    }
  }, [activeTrip, clearActiveTrip, router, rosterItemsForValidation]);

  return {
    activeTrip,
    validation,
    isLoadingValidation,
    validationError,
    isClosing,
    errorMessage,
    reloadValidation,
    handleCloseTrip,
  };
}
