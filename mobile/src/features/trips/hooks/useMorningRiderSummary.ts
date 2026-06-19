import { useEffect, useMemo, useRef, useState } from "react";

import { getPrioritaryStudents } from "@/src/features/trips/domain/trip-priority.rules";
import { getMorningAttendanceHints } from "@/src/features/trips/services/trip-day-context.service";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";
import type { TripDirection } from "@/src/features/trips/types";

export function useMorningRiderSummary(
  tripDate: string | undefined,
  direction: TripDirection | undefined,
  rosterItems: TripRosterItem[],
) {
  const isAfternoonReturn = direction === "retorno";
  const [morningRiderIds, setMorningRiderIds] = useState<Set<string>>(new Set());
  const loadedForDateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAfternoonReturn || !tripDate) {
      setMorningRiderIds(new Set());
      loadedForDateRef.current = null;
      return;
    }

    if (loadedForDateRef.current === tripDate) {
      return;
    }

    loadedForDateRef.current = tripDate;
    void getMorningAttendanceHints(tripDate)
      .then(setMorningRiderIds)
      .catch(() => setMorningRiderIds(new Set()));
  }, [isAfternoonReturn, tripDate]);

  const pendingMorningScans = useMemo(
    () => (isAfternoonReturn ? getPrioritaryStudents(rosterItems, morningRiderIds) : []),
    [isAfternoonReturn, morningRiderIds, rosterItems],
  );

  const preview = useMemo(
    () =>
      pendingMorningScans
        .slice(0, 4)
        .map(
          (item) => item.student.nombre_alumno.split(" ")[0] ?? item.student.nombre_alumno,
        ),
    [pendingMorningScans],
  );

  return {
    count: pendingMorningScans.length,
    preview,
    isVisible: isAfternoonReturn && pendingMorningScans.length > 0,
  };
}
