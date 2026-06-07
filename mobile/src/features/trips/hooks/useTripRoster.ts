import { useCallback, useEffect, useMemo, useState } from "react";

import { getErrorMessage } from "@/src/shared/utils/errors";
import {
  getTripRoster,
  markStudentExit,
  markStudentManually,
  type TripRosterItem,
} from "@/src/features/trips/services/trip-roster.service";
import {
  confirmManualAttendance,
  confirmStudentDropoff,
} from "@/src/features/trips/utils/rosterConfirmations";

export type RosterViewMode = "all" | "attended";

export function useTripRoster(tripId: string | undefined) {
  const [viewMode, setViewMode] = useState<RosterViewMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<TripRosterItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isMarkingStudentId, setIsMarkingStudentId] = useState<string | null>(null);

  const loadRoster = useCallback(async () => {
    if (!tripId) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const rosterItems = await getTripRoster(tripId);
      setItems(rosterItems);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "No se pudo cargar la lista de asistencia."));
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  const findStudentName = useCallback(
    (studentId: string) => items.find((item) => item.student.id === studentId)?.student,
    [items],
  );

  const handleManualMark = useCallback(
    async (studentId: string) => {
      if (!tripId || isMarkingStudentId) {
        return;
      }

      const selectedStudent = findStudentName(studentId);
      if (!selectedStudent) {
        setErrorMessage("No se encontró el alumno seleccionado.");
        return;
      }

      const isConfirmed = await confirmManualAttendance(selectedStudent.nombre_alumno);
      if (!isConfirmed) {
        return;
      }

      setIsMarkingStudentId(studentId);
      setErrorMessage(null);
      setInfoMessage(null);

      try {
        await markStudentManually(tripId, studentId);
        setInfoMessage("Registro manual guardado.");
        await loadRoster();
      } catch (error: unknown) {
        setErrorMessage(getErrorMessage(error, "No se pudo registrar manualmente."));
      } finally {
        setIsMarkingStudentId(null);
      }
    },
    [tripId, isMarkingStudentId, findStudentName, loadRoster],
  );

  const handleExitMark = useCallback(
    async (studentId: string) => {
      if (!tripId || isMarkingStudentId) {
        return;
      }

      const selectedStudent = findStudentName(studentId);
      if (!selectedStudent) {
        setErrorMessage("No se encontró el alumno seleccionado.");
        return;
      }

      const isConfirmed = await confirmStudentDropoff(selectedStudent.nombre_alumno);
      if (!isConfirmed) {
        return;
      }

      setIsMarkingStudentId(studentId);
      setErrorMessage(null);
      setInfoMessage(null);

      try {
        await markStudentExit(tripId, studentId);
        setInfoMessage("Salida registrada correctamente.");
        await loadRoster();
      } catch (error: unknown) {
        setErrorMessage(getErrorMessage(error, "No se pudo registrar la salida."));
      } finally {
        setIsMarkingStudentId(null);
      }
    },
    [tripId, isMarkingStudentId, findStudentName, loadRoster],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const baseItems = viewMode === "attended" ? items.filter((item) => item.hasAttendance) : items;

    if (!normalizedQuery) {
      return baseItems;
    }

    return baseItems.filter(
      (item) =>
        item.student.nombre_alumno.toLowerCase().includes(normalizedQuery) ||
        item.student.id.toLowerCase().includes(normalizedQuery) ||
        (item.student.codigo ?? "").toLowerCase().includes(normalizedQuery),
    );
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
    isLoading,
    errorMessage,
    infoMessage,
    isMarkingStudentId,
    stats,
    loadRoster,
    handleManualMark,
    handleExitMark,
  };
}
