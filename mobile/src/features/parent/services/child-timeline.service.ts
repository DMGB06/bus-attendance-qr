import { supabase } from "@/src/core/config/supabase";
import { getTodayDateIso } from "@/src/features/parent/utils/date";
import { APP_TIME_ZONE } from "@/src/shared/utils/local-date";
import { filterValidUuids, isUuid } from "@/src/shared/utils/uuid";
import type { ChildTimelineEvent } from "@/src/features/parent/types";
import type { Trip } from "@/src/features/trips/types";

type AttendanceRecordSlice = {
  id: string;
  student_id: string;
  event_type: ChildTimelineEvent["event_type"];
  scanned_at: string | null;
  trip_id: string;
  voided_at: string | null;
};

type TripSlice = Pick<Trip, "id" | "direction" | "turn_type" | "trip_date" | "status">;

function getLocalDayStartIso(today: string): string {
  const offset = APP_TIME_ZONE === "America/Lima" ? "-05:00" : "Z";
  return `${today}T00:00:00${offset}`;
}

function isTripRelevantToday(trip: TripSlice, today: string): boolean {
  return trip.trip_date === today || trip.status === "active";
}

async function fetchTripsForTimeline(tripIds: string[]): Promise<TripSlice[]> {
  const validIds = filterValidUuids(tripIds);
  if (!validIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("bus_trips")
    .select("id, direction, turn_type, trip_date, status")
    .in("id", validIds);

  if (error) {
    throw new Error("No se pudieron cargar los viajes del día.");
  }

  return (data ?? []) as TripSlice[];
}

function buildTimelineForRecords(
  records: AttendanceRecordSlice[],
  trips: TripSlice[],
  today: string,
): ChildTimelineEvent[] {
  const tripMap = new Map(trips.map((trip) => [trip.id, trip]));

  return records
    .filter((record) => {
      if (record.voided_at) {
        return false;
      }

      const trip = tripMap.get(record.trip_id);
      return trip && isTripRelevantToday(trip, today);
    })
    .map((record) => {
      const trip = tripMap.get(record.trip_id)!;

      return {
        id: record.id,
        event_type: record.event_type,
        scanned_at: record.scanned_at,
        trip_id: record.trip_id,
        trip_direction: trip.direction,
        turn_type: trip.turn_type,
        voided_at: record.voided_at,
      };
    })
    .sort((left, right) => (left.scanned_at ?? "").localeCompare(right.scanned_at ?? ""));
}

export async function getChildTimelineToday(studentId: string): Promise<ChildTimelineEvent[]> {
  if (!isUuid(studentId)) {
    return [];
  }

  const today = getTodayDateIso();

  const { data: records, error: recordsError } = await supabase
    .from("bus_attendance_records")
    .select("id, student_id, event_type, scanned_at, trip_id, voided_at")
    .eq("student_id", studentId)
    .is("voided_at", null)
    .gte("scanned_at", getLocalDayStartIso(today))
    .order("scanned_at", { ascending: true });

  if (recordsError) {
    throw new Error("No se pudo cargar el historial del día.");
  }

  const slice = (records ?? []) as AttendanceRecordSlice[];
  const tripIds = [...new Set(slice.map((record) => record.trip_id))];

  if (!tripIds.length) {
    return [];
  }

  const trips = await fetchTripsForTimeline(tripIds);
  return buildTimelineForRecords(slice, trips, today);
}

/** Historial del día para varios hijos (lista padre). */
export async function getChildrenTimelinesToday(
  studentIds: string[],
): Promise<Map<string, ChildTimelineEvent[]>> {
  const validIds = filterValidUuids(studentIds);
  const result = new Map<string, ChildTimelineEvent[]>();

  if (!validIds.length) {
    return result;
  }

  const today = getTodayDateIso();

  const { data: records, error: recordsError } = await supabase
    .from("bus_attendance_records")
    .select("id, student_id, event_type, scanned_at, trip_id, voided_at")
    .in("student_id", validIds)
    .is("voided_at", null)
    .gte("scanned_at", getLocalDayStartIso(today))
    .order("scanned_at", { ascending: true });

  if (recordsError) {
    throw new Error("No se pudo cargar el historial del día.");
  }

  const slice = (records ?? []) as AttendanceRecordSlice[];
  const tripIds = [...new Set(slice.map((record) => record.trip_id))];

  if (!tripIds.length) {
    for (const studentId of validIds) {
      result.set(studentId, []);
    }
    return result;
  }

  const trips = await fetchTripsForTimeline(tripIds);

  for (const studentId of validIds) {
    const studentRecords = slice.filter((record) => record.student_id === studentId);
    result.set(studentId, buildTimelineForRecords(studentRecords, trips, today));
  }

  return result;
}
