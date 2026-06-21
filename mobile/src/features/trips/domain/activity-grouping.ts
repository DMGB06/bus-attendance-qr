import { formatTripTitle } from "@/src/features/trips/domain/trip-labels";
import { getLocalTodayDateIso } from "@/src/shared/utils/local-date";
import type {
  ActivityDayGroup,
  ActivityDayOption,
  ActivityTripGroup,
  OperatorActivityRow,
} from "@/src/features/trips/types/activity.types";
import type { TripDirection, TurnType } from "@/src/features/trips/types";

const DAY_MS = 24 * 60 * 60 * 1000;

function parseLocalDate(dateIso: string): Date {
  return new Date(`${dateIso}T12:00:00`);
}

function toDateIso(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getTodayDateIso(): string {
  return getLocalTodayDateIso();
}

export function getWeekDateRange(todayIso = getTodayDateIso()): {
  startDate: string;
  endDate: string;
} {
  const endDate = parseLocalDate(todayIso);
  const startDate = new Date(endDate.getTime() - 6 * DAY_MS);

  return {
    startDate: toDateIso(startDate),
    endDate: todayIso,
  };
}

export function buildDayOptions(todayIso = getTodayDateIso()): ActivityDayOption[] {
  const endDate = parseLocalDate(todayIso);
  const options: ActivityDayOption[] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = toDateIso(new Date(endDate.getTime() - offset * DAY_MS));
    options.push({
      date,
      label: formatDayChipLabel(date, todayIso),
      detailLabel: formatDayDetailLabel(date),
    });
  }

  return options;
}

export function formatDayChipLabel(dateIso: string, todayIso: string): string {
  if (dateIso === todayIso) {
    return "Hoy";
  }

  const yesterdayIso = toDateIso(new Date(parseLocalDate(todayIso).getTime() - DAY_MS));
  if (dateIso === yesterdayIso) {
    return "Ayer";
  }

  const formatted = parseLocalDate(dateIso).toLocaleDateString("es-PE", {
    weekday: "short",
    day: "numeric",
  });

  const normalized = formatted.replace(/\./g, "").trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function formatDayDetailLabel(dateIso: string): string {
  const formatted = parseLocalDate(dateIso).toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatDayMenuLabel(dateIso: string, todayIso: string): string {
  const shortLabel = formatDayChipLabel(dateIso, todayIso);
  const detail = formatDayDetailLabel(dateIso);

  if (shortLabel === "Hoy" || shortLabel === "Ayer") {
    return `${shortLabel} · ${detail}`;
  }

  return detail;
}

function compareScannedAtDesc(a: OperatorActivityRow, b: OperatorActivityRow): number {
  const aTime = a.scannedAt ? new Date(a.scannedAt).getTime() : 0;
  const bTime = b.scannedAt ? new Date(b.scannedAt).getTime() : 0;
  return bTime - aTime;
}

function buildTripTitle(
  direction: TripDirection,
  turnType: TurnType | null,
): string {
  return formatTripTitle({ direction, turn_type: turnType });
}

export function groupActivityByDayAndTrip(
  rows: OperatorActivityRow[],
  todayIso = getTodayDateIso(),
): ActivityDayGroup[] {
  const byDate = new Map<string, Map<string, OperatorActivityRow[]>>();

  for (const row of rows) {
    if (!byDate.has(row.tripDate)) {
      byDate.set(row.tripDate, new Map());
    }

    const byTrip = byDate.get(row.tripDate)!;
    if (!byTrip.has(row.tripId)) {
      byTrip.set(row.tripId, []);
    }

    byTrip.get(row.tripId)!.push(row);
  }

  return [...byDate.entries()]
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .map(([date, tripsMap]) => {
      const trips: ActivityTripGroup[] = [...tripsMap.entries()].map(([tripId, events]) => {
        const sortedEvents = [...events].sort(compareScannedAtDesc);
        const first = sortedEvents[0];

        return {
          tripId,
          title: buildTripTitle(first.tripDirection, first.turnType),
          events: sortedEvents,
        };
      });

      return {
        date,
        dateLabel: formatDayChipLabel(date, todayIso),
        trips,
      };
    });
}

export function getTripsForDate(
  groupedDays: ActivityDayGroup[],
  dateIso: string,
): ActivityTripGroup[] {
  return groupedDays.find((day) => day.date === dateIso)?.trips ?? [];
}
