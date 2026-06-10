import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getErrorMessage } from "@/src/shared/utils/errors";
import {
  isMorningRider,
} from "@/src/features/trips/domain/trip-priority.rules";
import {
  countStudentsWithNivelData,
  countSuggestedLevelMatches,
  getSuggestedNivelForTurn,
  matchesSuggestedLevelFilter,
} from "@/src/features/trips/domain/student-level.rules";
import {
  getDropoffQueuedMessage,
  getDropoffRegisteredMessage,
} from "@/src/features/trips/domain/trip-labels";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";
import { getMorningAttendanceHints, invalidateMorningAttendanceHints } from "@/src/features/trips/services/trip-day-context.service";
import { rosterStoreActions, useRosterItems, useRosterItemStats, useRosterMeta } from "@/src/features/trips/store/rosterStore";
import { useTripStore } from "@/src/features/trips/store/tripStore";
import {
  buildRosterItemBuckets,
  filterRosterItemsByQuery,
} from "@/src/features/trips/utils/roster-filter.utils";
import {
  confirmBulkDropoff,
  confirmStudentAbsent,
  confirmStudentDropoff,
} from "@/src/features/trips/utils/rosterConfirmations";

export type RosterViewMode = "all" | "pending" | "onboard" | "completed" | "attended" | "prioritarios";

export function useTripRoster(tripId: string | undefined) {
  const { activeTrip } = useTripStore();
  const items = useRosterItems(tripId);
  const rosterMeta = useRosterMeta(tripId);
  const itemStats = useRosterItemStats(tripId);
  const [viewMode, setViewMode] = useState<RosterViewMode>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isMarkingStudentId, setIsMarkingStudentId] = useState<string | null>(null);
  const [isBulkDropping, setIsBulkDropping] = useState(false);
  const [morningRiderIds, setMorningRiderIds] = useState<Set<string>>(new Set());
  const [useSuggestedLevelFilter, setUseSuggestedLevelFilter] = useState(true);
  const morningHintsLoadedForDateRef = useRef<string | null>(null);

  const isAfternoonReturn = activeTrip?.direction === "retorno";
  const suggestedNivel = getSuggestedNivelForTurn(activeTrip?.turn_type);

  useEffect(() => {
    if (!tripId) {
      return;
    }

    setViewMode("pending");
    setSearchQuery("");
    setUseSuggestedLevelFilter(true);
  }, [tripId]);

  useEffect(() => {
    setUseSuggestedLevelFilter(true);
  }, [suggestedNivel, tripId]);

  useEffect(() => {
    if (!isAfternoonReturn || !activeTrip?.trip_date) {
      setMorningRiderIds(new Set());
      morningHintsLoadedForDateRef.current = null;
      return;
    }

    if (morningHintsLoadedForDateRef.current === activeTrip.trip_date) {
      return;
    }

    morningHintsLoadedForDateRef.current = activeTrip.trip_date;
    void getMorningAttendanceHints(activeTrip.trip_date)
      .then(setMorningRiderIds)
      .catch(() => setMorningRiderIds(new Set()));
  }, [isAfternoonReturn, activeTrip?.trip_date]);

  useEffect(() => {
    if (viewMode === "prioritarios" && !isAfternoonReturn) {
      setViewMode("all");
    }
  }, [isAfternoonReturn, viewMode]);

  const levelScopedItems = useMemo(() => {
    if (!useSuggestedLevelFilter || !suggestedNivel) {
      return items;
    }
    return items.filter((item) => matchesSuggestedLevelFilter(item.student, suggestedNivel));
  }, [items, suggestedNivel, useSuggestedLevelFilter]);

  const withLevelDataCount = useMemo(
    () => countStudentsWithNivelData(items.map((item) => item.student)),
    [items],
  );

  const loadRoster = useCallback(async () => {
    if (!tripId) {
      return;
    }
    await rosterStoreActions.refreshTripRoster(tripId, { force: true });

    if (isAfternoonReturn && activeTrip?.trip_date) {
      invalidateMorningAttendanceHints(activeTrip.trip_date);
      morningHintsLoadedForDateRef.current = null;
      void getMorningAttendanceHints(activeTrip.trip_date)
        .then((hints) => {
          morningHintsLoadedForDateRef.current = activeTrip.trip_date;
          setMorningRiderIds(hints);
        })
        .catch(() => setMorningRiderIds(new Set()));
    }
  }, [tripId, isAfternoonReturn, activeTrip?.trip_date]);

  const findStudentName = useCallback(
    (studentId: string) => items.find((item) => item.student.id === studentId)?.student,
    [items],
  );

  const handleExitMark = useCallback(
    async (studentId: string) => {
      if (!tripId || isMarkingStudentId) {
        return;
      }

      const selectedStudent = findStudentName(studentId);
      if (!selectedStudent || !activeTrip) {
        return;
      }

      const isConfirmed = await confirmStudentDropoff(
        selectedStudent.nombre_alumno,
        activeTrip.direction,
      );
      if (!isConfirmed) {
        return;
      }

      setIsMarkingStudentId(studentId);
      setInfoMessage(null);

      try {
        const result = await rosterStoreActions.registerStudentAttendance(tripId, studentId, "bajo");
        if (result.queued) {
          setInfoMessage(getDropoffQueuedMessage(activeTrip.direction));
        } else {
          setInfoMessage(getDropoffRegisteredMessage(activeTrip.direction));
        }
        setViewMode("all");
      } catch (error: unknown) {
        setInfoMessage(getErrorMessage(error, "No se pudo registrar la bajada."));
      } finally {
        setIsMarkingStudentId(null);
      }
    },
    [tripId, activeTrip, isMarkingStudentId, findStudentName],
  );

  const handleMarkAbsent = useCallback(
    async (studentId: string) => {
      if (!tripId || isMarkingStudentId || !isAfternoonReturn) {
        return;
      }

      const selectedStudent = findStudentName(studentId);
      if (!selectedStudent) {
        return;
      }

      const isConfirmed = await confirmStudentAbsent(selectedStudent.nombre_alumno);
      if (!isConfirmed) {
        return;
      }

      setIsMarkingStudentId(studentId);
      setInfoMessage(null);

      try {
        const result = await rosterStoreActions.registerStudentAttendance(tripId, studentId, "ausente");
        if (result.queued) {
          setInfoMessage("Ausencia guardada localmente. Se sincronizará al recuperar señal.");
        } else {
          setInfoMessage("Alumno marcado como ausente en este tramo.");
        }
      } catch (error: unknown) {
        setInfoMessage(getErrorMessage(error, "No se pudo registrar la ausencia."));
      } finally {
        setIsMarkingStudentId(null);
      }
    },
    [tripId, isMarkingStudentId, isAfternoonReturn, findStudentName],
  );

  const handleBulkDropoff = useCallback(async () => {
    if (!tripId || !activeTrip || isBulkDropping) {
      return;
    }

    const onboardCount = itemStats.onboardCount;
    if (onboardCount === 0) {
      return;
    }

    const isConfirmed = await confirmBulkDropoff(onboardCount, activeTrip.direction);
    if (!isConfirmed) {
      return;
    }

    setIsBulkDropping(true);
    setInfoMessage(null);

    try {
      const result = await rosterStoreActions.bulkRegisterDropoff(tripId);
      const placeLabel = activeTrip.direction === "recojo" ? "colegio" : "casa";
      if (result.queued) {
        setInfoMessage(
          `${result.count} registro(s) guardados localmente. Se sincronizarán al recuperar señal.`,
        );
      } else {
        setInfoMessage(`${result.count} alumno(s) registrados en ${placeLabel}.`);
      }
      setViewMode("all");
    } catch (error: unknown) {
      setInfoMessage(getErrorMessage(error, "No se pudo registrar la bajada masiva."));
    } finally {
      setIsBulkDropping(false);
    }
  }, [tripId, activeTrip, isBulkDropping, itemStats.onboardCount]);

  const itemBuckets = useMemo(
    () => buildRosterItemBuckets(levelScopedItems, morningRiderIds, isAfternoonReturn),
    [levelScopedItems, morningRiderIds, isAfternoonReturn],
  );

  const filteredItems = useMemo(() => {
    const baseItems = itemBuckets.byViewMode[viewMode];
    return filterRosterItemsByQuery(baseItems, searchQuery);
  }, [itemBuckets, viewMode, searchQuery]);

  const prioritariosItems = itemBuckets.prioritarios;

  const stats = useMemo(
    () => ({
      attendedCount: itemBuckets.attended.length,
      onboardCount: itemBuckets.onboard.length,
      completedCount: itemBuckets.completed.length,
      pendingCount: itemBuckets.pending.length,
      prioritariosCount: itemBuckets.prioritarios.length,
    }),
    [itemBuckets],
  );

  const suggestedLevelMatchCount = useMemo(
    () =>
      suggestedNivel ? countSuggestedLevelMatches(items, suggestedNivel) : items.length,
    [items, suggestedNivel],
  );

  const prioritariosPreview = useMemo(
    () =>
      prioritariosItems
        .slice(0, 4)
        .map((item) => item.student.nombre_alumno.split(" ")[0] ?? item.student.nombre_alumno),
    [prioritariosItems],
  );

  const isMorningRiderForStudent = useCallback(
    (studentId: string) => isMorningRider(studentId, morningRiderIds),
    [morningRiderIds],
  );

  return {
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    items,
    filteredItems,
    isLoading: rosterMeta.isHydrating && items.length === 0,
    isRefreshing: rosterMeta.isRefreshing,
    isShowingCache: rosterMeta.isShowingCache,
    cacheSavedAt: rosterMeta.cacheSavedAt,
    pendingSyncCount: rosterMeta.pendingSyncCount,
    errorMessage: rosterMeta.errorMessage,
    infoMessage,
    isMarkingStudentId,
    isBulkDropping,
    isAfternoonReturn,
    morningRiderIds,
    isMorningRider: isMorningRiderForStudent,
    stats,
    prioritariosPreview,
    suggestedNivel,
    useSuggestedLevelFilter,
    setUseSuggestedLevelFilter,
    withLevelDataCount,
    suggestedLevelMatchCount,
    totalStudentCount: itemStats.totalCount,
    totalOnboardCount: itemStats.onboardCount,
    loadRoster,
    handleExitMark,
    handleMarkAbsent,
    handleBulkDropoff,
  };
}
