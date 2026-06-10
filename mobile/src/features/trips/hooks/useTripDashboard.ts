import { useCallback, useState } from "react";

import { getErrorMessage } from "@/src/shared/utils/errors";
import { confirmBulkDropoff } from "@/src/features/trips/utils/rosterConfirmations";
import { rosterStoreActions, useRosterItemStats } from "@/src/features/trips/store/rosterStore";
import type { Trip } from "@/src/features/trips/types";

export function useTripDashboard(activeTrip: Trip | null) {
  const tripId = activeTrip?.id;
  const stats = useRosterItemStats(tripId);
  const [isBulkDropping, setIsBulkDropping] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const totalOnboardCount = stats.onboardCount;

  const handleBulkDropoff = useCallback(async () => {
    if (!tripId || !activeTrip || isBulkDropping || totalOnboardCount === 0) {
      return;
    }

    const isConfirmed = await confirmBulkDropoff(totalOnboardCount, activeTrip.direction);
    if (!isConfirmed) {
      return;
    }

    setIsBulkDropping(true);
    setBulkError(null);

    try {
      await rosterStoreActions.bulkRegisterDropoff(tripId);
    } catch (error: unknown) {
      setBulkError(getErrorMessage(error, "No se pudo registrar la bajada masiva."));
    } finally {
      setIsBulkDropping(false);
    }
  }, [tripId, activeTrip, isBulkDropping, totalOnboardCount]);

  return {
    stats,
    totalOnboardCount,
    isBulkDropping,
    bulkError,
    handleBulkDropoff,
  };
}
