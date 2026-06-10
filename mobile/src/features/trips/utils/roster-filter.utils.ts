import { isPrioritaryStudent } from "@/src/features/trips/domain/trip-priority.rules";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";

const STATUS_SORT_ORDER: Record<TripRosterItem["status"], number> = {
  pending: 0,
  onboard: 1,
  completed: 2,
};

export type RosterItemBuckets = {
  all: TripRosterItem[];
  pending: TripRosterItem[];
  onboard: TripRosterItem[];
  completed: TripRosterItem[];
  attended: TripRosterItem[];
  prioritarios: TripRosterItem[];
  /** Preordenados por modo de vista (evita sort en cada keystroke de búsqueda). */
  byViewMode: Record<
    "all" | "pending" | "onboard" | "completed" | "attended" | "prioritarios",
    TripRosterItem[]
  >;
};

function sortByName(items: TripRosterItem[]): TripRosterItem[] {
  return [...items].sort((a, b) =>
    a.student.nombre_alumno.localeCompare(b.student.nombre_alumno, "es"),
  );
}

function sortAllItems(
  items: TripRosterItem[],
  morningRiderIds: Set<string>,
  isAfternoonReturn: boolean,
): TripRosterItem[] {
  return [...items].sort((a, b) => {
    if (isAfternoonReturn) {
      const aPriority = isPrioritaryStudent(a, morningRiderIds) ? 0 : 1;
      const bPriority = isPrioritaryStudent(b, morningRiderIds) ? 0 : 1;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
    }
    const statusDiff = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    return a.student.nombre_alumno.localeCompare(b.student.nombre_alumno, "es");
  });
}

function sortByScannedDesc(items: TripRosterItem[]): TripRosterItem[] {
  return [...items].sort((a, b) => {
    const aTime = a.attendance?.scanned_at ? new Date(a.attendance.scanned_at).getTime() : 0;
    const bTime = b.attendance?.scanned_at ? new Date(b.attendance.scanned_at).getTime() : 0;
    return bTime - aTime;
  });
}

export function buildRosterItemBuckets(
  items: TripRosterItem[],
  morningRiderIds: Set<string>,
  isAfternoonReturn: boolean,
): RosterItemBuckets {
  const pending: TripRosterItem[] = [];
  const onboard: TripRosterItem[] = [];
  const completed: TripRosterItem[] = [];
  const attended: TripRosterItem[] = [];
  const prioritarios: TripRosterItem[] = [];

  for (const item of items) {
    if (item.status === "pending") {
      pending.push(item);
    } else if (item.status === "onboard") {
      onboard.push(item);
    } else if (item.status === "completed") {
      completed.push(item);
    }
    if (item.hasAttendance) {
      attended.push(item);
    }
    if (isPrioritaryStudent(item, morningRiderIds)) {
      prioritarios.push(item);
    }
  }

  return {
    all: items,
    pending,
    onboard,
    completed,
    attended,
    prioritarios,
    byViewMode: {
      all: sortAllItems(items, morningRiderIds, isAfternoonReturn),
      pending: sortByName(pending),
      onboard: sortByName(onboard),
      completed: sortByScannedDesc(completed),
      attended: sortByScannedDesc(attended),
      prioritarios: sortByName(prioritarios),
    },
  };
}

export function filterRosterItemsByQuery(
  items: TripRosterItem[],
  searchQuery: string,
): TripRosterItem[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) {
    return items;
  }

  return items.filter(
    (item) =>
      item.student.nombre_alumno.toLowerCase().includes(normalizedQuery) ||
      item.student.id.toLowerCase().includes(normalizedQuery) ||
      (item.student.codigo ?? "").toLowerCase().includes(normalizedQuery),
  );
}