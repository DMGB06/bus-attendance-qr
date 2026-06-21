import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/src/core/config/supabase";
import {
  buildDayOptions,
  formatDayChipLabel,
  getTodayDateIso,
  getTripsForDate,
  groupActivityByDayAndTrip,
} from "@/src/features/trips/domain/activity-grouping";
import {
  filterGroupedDaysByStudentName,
  getActivitySearchEmptyMessage,
} from "@/src/features/trips/domain/activity-search.rules";
import { getOperatorActivityWeek } from "@/src/features/trips/services/operator-activity.service";
import { useTripStore } from "@/src/features/trips/store/tripStore";
import type { ActivityDayGroup, ActivityDayOption } from "@/src/features/trips/types/activity.types";
import { useDebouncedValue } from "@/src/shared/hooks/useDebouncedValue";

const ACTIVITY_SEARCH_DEBOUNCE_MS = 250;

type OperatorActivityHistoryState = {
  dayOptions: ActivityDayOption[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchActive: boolean;
  visibleDays: ActivityDayGroup[];
  emptyMessage: string;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useOperatorActivityHistory(): OperatorActivityHistoryState {
  const todayIso = getTodayDateIso();
  const { activeTrip } = useTripStore();
  const activeTripId = activeTrip?.id;
  const [dayOptions] = useState(() => buildDayOptions(todayIso));
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, ACTIVITY_SEARCH_DEBOUNCE_MS);
  const [groupedDays, setGroupedDays] = useState(() => groupActivityByDayAndTrip([], todayIso));
  const [assignedDates, setAssignedDates] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const isSearchActive = debouncedSearchQuery.trim().length > 0;

  const loadWeek = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!silent) {
      setLoading(true);
    }

    try {
      const result = await getOperatorActivityWeek();

      if (mountedRef.current) {
        setGroupedDays(groupActivityByDayAndTrip(result.rows, todayIso));
        setAssignedDates(result.assignedDates);
        setError(null);
      }
    } catch (loadError) {
      if (mountedRef.current) {
        setError(loadError instanceof Error ? loadError.message : "Error al cargar el historial.");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [todayIso]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadWeek({ silent: true });
  }, [loadWeek]);

  useEffect(() => {
    mountedRef.current = true;
    void loadWeek();

    return () => {
      mountedRef.current = false;
    };
  }, [loadWeek]);

  useEffect(() => {
    if (!activeTripId) {
      return;
    }

    const channel = supabase
      .channel(`operator-activity-${activeTripId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "buscontrol",
          table: "bus_attendance_records",
          filter: `trip_id=eq.${activeTripId}`,
        },
        () => {
          void loadWeek({ silent: true });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "buscontrol",
          table: "bus_attendance_records",
          filter: `trip_id=eq.${activeTripId}`,
        },
        () => {
          void loadWeek({ silent: true });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeTripId, loadWeek]);

  const filteredGroupedDays = useMemo(
    () => filterGroupedDaysByStudentName(groupedDays, debouncedSearchQuery),
    [groupedDays, debouncedSearchQuery],
  );

  const visibleDays = useMemo(() => {
    if (isSearchActive) {
      return filteredGroupedDays;
    }

    const trips = getTripsForDate(groupedDays, selectedDate);
    if (!trips.length) {
      return [];
    }

    return [
      {
        date: selectedDate,
        dateLabel: formatDayChipLabel(selectedDate, todayIso),
        trips,
      },
    ];
  }, [filteredGroupedDays, groupedDays, isSearchActive, selectedDate, todayIso]);

  const emptyMessage = useMemo(() => {
    if (isSearchActive) {
      return getActivitySearchEmptyMessage(debouncedSearchQuery);
    }

    if (!assignedDates.has(selectedDate)) {
      return "No tuviste asignación de bus este día.";
    }

    return "Sin registros este día.";
  }, [assignedDates, debouncedSearchQuery, isSearchActive, selectedDate]);

  return {
    dayOptions,
    selectedDate,
    setSelectedDate,
    searchQuery,
    setSearchQuery,
    isSearchActive,
    visibleDays,
    emptyMessage,
    loading,
    refreshing,
    error,
    refresh,
  };
}
