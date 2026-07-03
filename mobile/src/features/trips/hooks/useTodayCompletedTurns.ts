import { useCallback, useEffect, useState } from "react";

import { getCompletedTurnTypesForBusToday } from "@/src/features/trips/services/trips.service";
import type { TurnType } from "@/src/features/trips/types";
import { useAppForeground } from "@/src/shared/hooks/useAppForeground";
import { getLocalTodayDateIso } from "@/src/shared/utils/local-date";
import { getErrorMessage } from "@/src/shared/utils/errors";

/**
 * Consulta turnos completados hoy para el bus.
 * Re-consulta al cambiar de día (app en memoria de un día a otro) y cuando cambia `todayKey`.
 */
export function useTodayCompletedTurns(busId: string | null | undefined) {
  const isForeground = useAppForeground();
  const [todayKey, setTodayKey] = useState(() => getLocalTodayDateIso());
  const [completedTurns, setCompletedTurns] = useState<TurnType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isForeground) {
      return;
    }

    const currentDay = getLocalTodayDateIso();
    setTodayKey((previous) => (previous === currentDay ? previous : currentDay));
  }, [isForeground]);

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
      setTodayKey(getLocalTodayDateIso());
    } catch (error: unknown) {
      setCompletedTurns([]);
      setError(getErrorMessage(error, "No se pudo consultar los viajes del día."));
    } finally {
      setIsLoading(false);
    }
  }, [busId]);

  useEffect(() => {
    setCompletedTurns([]);
    void refresh();
  }, [refresh, todayKey]);

  return { completedTurns, isLoading, error, refresh, todayKey };
}
