import type { ActivityDayGroup, OperatorActivityRow } from "@/src/features/trips/types/activity.types";

export function normalizeActivitySearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getActivitySearchTokens(query: string): string[] {
  return normalizeActivitySearchText(query).split(/\s+/).filter(Boolean);
}

export function studentNameMatchesSearch(studentName: string, query: string): boolean {
  const tokens = getActivitySearchTokens(query);
  if (!tokens.length) {
    return true;
  }

  const haystack = normalizeActivitySearchText(studentName);
  return tokens.every((token) => haystack.includes(token));
}

export function filterActivityRowsByStudentName(
  rows: OperatorActivityRow[],
  query: string,
): OperatorActivityRow[] {
  const tokens = getActivitySearchTokens(query);
  if (!tokens.length) {
    return rows;
  }

  return rows.filter((row) => studentNameMatchesSearch(row.studentName, query));
}

export function filterGroupedDaysByStudentName(
  groupedDays: ActivityDayGroup[],
  query: string,
): ActivityDayGroup[] {
  const tokens = getActivitySearchTokens(query);
  if (!tokens.length) {
    return groupedDays;
  }

  return groupedDays
    .map((day) => ({
      ...day,
      trips: day.trips
        .map((trip) => ({
          ...trip,
          events: trip.events.filter((event) => studentNameMatchesSearch(event.studentName, query)),
        }))
        .filter((trip) => trip.events.length > 0),
    }))
    .filter((day) => day.trips.length > 0);
}

export function getActivitySearchEmptyMessage(query: string): string {
  const trimmed = query.trim();
  return `Ningún alumno coincide con «${trimmed}» en estos 7 días.`;
}
