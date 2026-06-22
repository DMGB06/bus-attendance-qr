import { useCallback, useEffect, useState } from "react";

import { getCompletedTurnTypesForBusToday } from "@/src/features/trips/services/trips.service";
import type { TurnType } from "@/src/features/trips/types";
import { getErrorMessage } from "@/src/shared/utils/errors";

export function useTodayCompletedTurns(busId: string | null | undefined) {
  const [completedTurns, setCompletedTurns] = useState<TurnType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!busId) {
      setCompletedTurns([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const turns = await getCompletedTurnTypesForBusToday(busId);
      setCompletedTurns(turns);
    } catch (error: unknown) {
      setCompletedTurns([]);
      setError(getErrorMessage(error, "No se pudo consultar los viajes del día."));
    } finally {
      setIsLoading(false);
    }
  }, [busId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { completedTurns, isLoading, error, refresh };
}
