import { supabase } from "@/src/core/config/supabase";
import { buildStudentTripStatusFromAttendance } from "@/src/features/parent/domain/parent-status-from-attendance";
import {
  pickPreferredStudentTripStatusForParent,
} from "@/src/features/parent/domain/parent-linked-students";
import { getTodayDateIso } from "@/src/features/parent/utils/date";
import { APP_TIME_ZONE } from "@/src/shared/utils/local-date";
import { filterValidUuids } from "@/src/shared/utils/uuid";
import type { StudentTripStatus } from "@/src/features/parent/types";
import type { Trip } from "@/src/features/trips/types";

type AttendanceSlice = {
  student_id: string;
  trip_id: string;
  event_type: string;
  scanned_at: string;
  voided_at: string | null;
};

type TripSlice = Pick<Trip, "id" | "trip_date" | "direction" | "status" | "turn_type">;

async function fetchStatusesFromTable(studentIds: string[], today: string): Promise<StudentTripStatus[]> {
  const validIds = filterValidUuids(studentIds);
  if (!validIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("student_trip_status")
    .select("*")
    .in("student_id", validIds)
    .eq("trip_date", today);

  if (error) {
    throw new Error("No se pudo consultar el estado de hoy.");
  }

  return (data ?? []) as StudentTripStatus[];
}

function isTripRelevantForToday(trip: TripSlice, today: string): boolean {
  return trip.trip_date === today || trip.status === "active";
}

function getLocalDayStartIso(today: string): string {
  const offset = APP_TIME_ZONE === "America/Lima" ? "-05:00" : "Z";
  return `${today}T00:00:00${offset}`;
}

async function fetchAttendanceSlices(studentIds: string[], today: string): Promise<AttendanceSlice[]> {
  const validIds = filterValidUuids(studentIds);
  if (!validIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("bus_attendance_records")
    .select("student_id, trip_id, event_type, scanned_at, voided_at")
    .in("student_id", validIds)
    .is("voided_at", null)
    .gte("scanned_at", getLocalDayStartIso(today));

  if (error) {
    throw new Error("No se pudo consultar la asistencia del día.");
  }

  return data ?? [];
}

async function fetchTripsByIds(tripIds: string[]): Promise<TripSlice[]> {
  const validIds = filterValidUuids(tripIds);
  if (!validIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("bus_trips")
    .select("id, trip_date, direction, status, turn_type")
    .in("id", validIds);

  if (error) {
    throw new Error("No se pudieron cargar los viajes del día.");
  }

  return (data ?? []) as TripSlice[];
}

function deriveStatusFromAttendance(
  studentId: string,
  records: AttendanceSlice[],
  tripMap: Map<string, TripSlice>,
  today: string,
): StudentTripStatus | null {
  const byTrip = new Map<string, AttendanceSlice[]>();

  for (const record of records) {
    const trip = tripMap.get(record.trip_id);
    if (!trip || !isTripRelevantForToday(trip, today)) {
      continue;
    }

    const bucket = byTrip.get(record.trip_id) ?? [];
    bucket.push(record);
    byTrip.set(record.trip_id, bucket);
  }

  let best: StudentTripStatus | null = null;

  for (const [tripId, tripRecords] of byTrip) {
    const trip = tripMap.get(tripId);
    if (!trip) {
      continue;
    }

    const derived = buildStudentTripStatusFromAttendance(
      studentId,
      tripId,
      trip.trip_date,
      trip.direction,
      tripRecords,
    );

    if (!best) {
      best = derived;
      continue;
    }

    best = pickPreferredStudentTripStatusForParent(best, derived, tripMap);
  }

  return best;
}

/** Combina `student_trip_status` con asistencia real; la asistencia gana si la tabla sigue en pending. */
export async function resolveTodayStatusesForStudents(
  studentIds: string[],
  today = getTodayDateIso(),
): Promise<StudentTripStatus[]> {
  const validIds = filterValidUuids(studentIds);
  if (!validIds.length) {
    return [];
  }

  const fromTable = await fetchStatusesFromTable(validIds, today);

  const records = await fetchAttendanceSlices(validIds, today);

  const tripIds = [
    ...new Set([
      ...fromTable.map((status) => status.trip_id),
      ...records.map((record) => record.trip_id),
    ]),
  ];
  const trips = await fetchTripsByIds(tripIds);
  const tripMap = new Map(trips.map((trip) => [trip.id, trip]));

  if (!records.length) {
    return pickBestStatusPerStudent(validIds, fromTable, tripMap);
  }

  const recordsByStudent = new Map<string, AttendanceSlice[]>();
  for (const record of records) {
    const bucket = recordsByStudent.get(record.student_id) ?? [];
    bucket.push(record);
    recordsByStudent.set(record.student_id, bucket);
  }

  const merged: StudentTripStatus[] = [];

  for (const studentId of validIds) {
    const candidates: StudentTripStatus[] = fromTable.filter(
      (status) => status.student_id === studentId,
    );

    const derived = deriveStatusFromAttendance(
      studentId,
      recordsByStudent.get(studentId) ?? [],
      tripMap,
      today,
    );

    if (derived) {
      candidates.push(derived);
    }

    if (!candidates.length) {
      continue;
    }

    let best = candidates[0];
    for (let index = 1; index < candidates.length; index += 1) {
      best = pickPreferredStudentTripStatusForParent(best, candidates[index], tripMap);
    }
    merged.push(best);
  }

  return merged;
}

function pickBestStatusPerStudent(
  studentIds: string[],
  statuses: StudentTripStatus[],
  tripMap: Map<string, TripSlice>,
): StudentTripStatus[] {
  const merged: StudentTripStatus[] = [];

  for (const studentId of studentIds) {
    const candidates = statuses.filter((status) => status.student_id === studentId);
    if (!candidates.length) {
      continue;
    }

    let best = candidates[0];
    for (let index = 1; index < candidates.length; index += 1) {
      best = pickPreferredStudentTripStatusForParent(best, candidates[index], tripMap);
    }
    merged.push(best);
  }

  return merged;
}

export async function fetchTripsForStatuses(statuses: StudentTripStatus[]): Promise<Trip[]> {
  const tripIds = [...new Set(statuses.map((status) => status.trip_id))];
  if (!tripIds.length) {
    return [];
  }

  const { data, error } = await supabase.from("bus_trips").select("*").in("id", tripIds);

  if (error) {
    throw new Error("No se pudieron cargar los viajes del día.");
  }

  return data ?? [];
}
