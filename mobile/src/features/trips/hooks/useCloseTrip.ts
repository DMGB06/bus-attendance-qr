import { useCallback, useEffect, useRef, useState } from "react";
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
import { getTripClosedSuccessMessage } from "@/src/features/trips/domain/trip-labels";
import { loadCloseTripValidation } from "@/src/features/trips/services/close-trip-validation.service";
import { closeTrip, getActiveTripForCurrentUser, isTripAlreadyClosedError } from "@/src/features/trips/services/trips.service";
import {
  getRosterSnapshot,
  rosterStoreActions,
  useRosterItems,
} from "@/src/features/trips/store/rosterStore";
import { tripStoreActions, useTripStore } from "@/src/features/trips/store/tripStore";
import {
  confirmCloseWithPendingStudents,
  confirmCloseWithPendingSync,
} from "@/src/features/trips/utils/rosterConfirmations";
import type { TripDirection } from "@/src/features/trips/types";
import { countPendingForTrip } from "@/src/features/trips/storage/attendance-queue.storage";

const EMPTY_VALIDATION: CloseTripValidationResult = {
  pendingDropoff: [],
  missingPrioritarios: [],
  connectivityWarning: null,
};

export function useCloseTrip() {
  const router = useRouter();
  const { activeTrip, clearActiveTrip, setActiveTrip } = useTripStore();
  const rosterItems = useRosterItems(activeTrip?.id);
  const hadRosterItemsRef = useRef(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isLoadingValidation, setIsLoadingValidation] = useState(false);
  const [validation, setValidation] = useState<CloseTripValidationResult>(EMPTY_VALIDATION);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const reloadValidation = useCallback(async (options?: { silent?: boolean }) => {
    if (!activeTrip) {
      setValidation(EMPTY_VALIDATION);
      setValidationError(null);
      return;
    }

    const snapshot = getRosterSnapshot();
    const prefetchedRoster =
      snapshot.tripId === activeTrip.id && snapshot.items.length > 0
        ? snapshot.items
        : undefined;

    if (!options?.silent) {
      setIsLoadingValidation(true);
    }
    setValidationError(null);

    try {
      const nextValidation = await loadCloseTripValidation(activeTrip, {
        rosterItems: prefetchedRoster,
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
  }, [activeTrip]);

  useEffect(() => {
    hadRosterItemsRef.current = false;
    void reloadValidation();
  }, [reloadValidation]);

  useEffect(() => {
    if (!activeTrip || rosterItems.length === 0) {
      return;
    }

    if (!hadRosterItemsRef.current) {
      hadRosterItemsRef.current = true;
      void reloadValidation({ silent: true });
    }
  }, [activeTrip, rosterItems.length, reloadValidation]);

  const finishCloseLocally = useCallback(
    async (tripId: string, direction: TripDirection) => {
      rosterStoreActions.clearRosterStore();
      await cleanupTripAfterClose(tripId);
      tripStoreActions.setCloseSuccessMessage(getTripClosedSuccessMessage(direction));
      clearActiveTrip();
      router.replace(OPS_ROUTES.trip);
    },
    [clearActiveTrip, router],
  );

  const handleCloseTrip = useCallback(async () => {
    if (!activeTrip) {
      setErrorMessage("No hay viaje activo para cerrar.");
      return;
    }

    const tripId = activeTrip.id;
    setErrorMessage(null);
    setIsClosing(true);

    try {
      const snapshot = getRosterSnapshot();
      const prefetchedRoster =
        snapshot.tripId === activeTrip.id && snapshot.items.length > 0
          ? snapshot.items
          : undefined;
      const latestValidation = await loadCloseTripValidation(activeTrip, {
        rosterItems: prefetchedRoster,
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

      const freshTrip = await getActiveTripForCurrentUser();
      if (!freshTrip) {
        await finishCloseLocally(tripId, activeTrip.direction);
        return;
      }

      if (freshTrip.id !== activeTrip.id) {
        setActiveTrip(freshTrip);
      }

      try {
        await closeTrip(freshTrip.id);
      } catch (error: unknown) {
        if (isTripAlreadyClosedError(error)) {
          await finishCloseLocally(freshTrip.id, freshTrip.direction);
          return;
        }
        throw error;
      }

      await finishCloseLocally(freshTrip.id, freshTrip.direction);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "No se pudo cerrar el viaje."));
    } finally {
      setIsClosing(false);
    }
  }, [
    activeTrip,
    finishCloseLocally,
    setActiveTrip,
  ]);

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
