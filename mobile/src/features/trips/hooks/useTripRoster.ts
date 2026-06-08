import { useCallback, useEffect, useMemo, useState } from "react";

import { getErrorMessage } from "@/src/shared/utils/errors";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";
import { rosterStoreActions, useRosterStore } from "@/src/features/trips/store/rosterStore";
import { confirmStudentDropoff } from "@/src/features/trips/utils/rosterConfirmations";

export type RosterViewMode = "all" | "pending" | "onboard" | "attended";

const STATUS_SORT_ORDER: Record<TripRosterItem["status"], number> = {
  pending: 0,
  onboard: 1,
  completed: 2,
};

export function useTripRoster(tripId: string | undefined) {
  const rosterState = useRosterStore();
  const [viewMode, setViewMode] = useState<RosterViewMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isMarkingStudentId, setIsMarkingStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) {
      rosterStoreActions.clearRosterStore();
      return;
    }

    void rosterStoreActions.hydrateTripRoster(tripId);
  }, [tripId]);

  const items = rosterState.tripId === tripId ? rosterState.items : [];

  const loadRoster = useCallback(async () => {
    if (!tripId) {
      return;
    }
    await rosterStoreActions.refreshTripRoster(tripId);
  }, [tripId]);

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
      if (!selectedStudent) {
        return;
      }

      const isConfirmed = await confirmStudentDropoff(selectedStudent.nombre_alumno);
      if (!isConfirmed) {
        return;
      }

      setIsMarkingStudentId(studentId);
      setInfoMessage(null);

      try {
        const result = await rosterStoreActions.registerStudentAttendance(tripId, studentId, "bajo");
        if (result.queued) {
          setInfoMessage("Salida guardada localmente. Se sincronizará al recuperar señal.");
        } else {
          setInfoMessage("Salida registrada correctamente.");
        }
      } catch (error: unknown) {
        setInfoMessage(getErrorMessage(error, "No se pudo registrar la salida."));
      } finally {
        setIsMarkingStudentId(null);
      }
    },
    [tripId, isMarkingStudentId, findStudentName],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    let baseItems = items;
    switch (viewMode) {
      case "pending":
        baseItems = items.filter((item) => item.status === "pending");
        break;
      case "onboard":
        baseItems = items.filter((item) => item.status === "onboard");
        break;
      case "attended":
        baseItems = items.filter((item) => item.hasAttendance);
        break;
      default:
        baseItems = items;
    }

    const matchesQuery = (item: TripRosterItem) =>
      item.student.nombre_alumno.toLowerCase().includes(normalizedQuery) ||
      item.student.id.toLowerCase().includes(normalizedQuery) ||
      (item.student.codigo ?? "").toLowerCase().includes(normalizedQuery);

    const result = normalizedQuery ? baseItems.filter(matchesQuery) : baseItems;
    const sorted = [...result];

    if (viewMode === "all") {
      sorted.sort((a, b) => {
        const statusDiff = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
        if (statusDiff !== 0) {
          return statusDiff;
        }
        return a.student.nombre_alumno.localeCompare(b.student.nombre_alumno, "es");
      });
    } else if (viewMode === "attended") {
      sorted.sort((a, b) => {
        const aTime = a.attendance?.scanned_at ? new Date(a.attendance.scanned_at).getTime() : 0;
        const bTime = b.attendance?.scanned_at ? new Date(b.attendance.scanned_at).getTime() : 0;
        return bTime - aTime;
      });
    } else {
      sorted.sort((a, b) =>
        a.student.nombre_alumno.localeCompare(b.student.nombre_alumno, "es"),
      );
    }

    return sorted;
  }, [items, searchQuery, viewMode]);

  const stats = useMemo(
    () => ({
      attendedCount: items.filter((item) => item.hasAttendance).length,
      onboardCount: items.filter((item) => item.status === "onboard").length,
      pendingCount: items.filter((item) => item.status === "pending").length,
    }),
    [items],
  );

  return {
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    items,
    filteredItems,
    isLoading: rosterState.isHydrating && items.length === 0,
    isRefreshing: rosterState.isRefreshing,
    isShowingCache: rosterState.isShowingCache,
    cacheSavedAt: rosterState.cacheSavedAt,
    pendingSyncCount: rosterState.pendingSyncCount,
    errorMessage: rosterState.errorMessage,
    infoMessage,
    isMarkingStudentId,
    stats,
    loadRoster,
    handleExitMark,
  };
}
