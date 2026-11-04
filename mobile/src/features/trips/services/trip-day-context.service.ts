import { supabase } from "@/src/core/config/supabase";
import type { AttendanceEventType } from "@/src/features/trips/types";
import { isBoardingEvent } from "@/src/features/trips/domain/attendance.rules";

const MORNING_HINTS_TTL_MS = 5 * 60 * 1000;
const morningHintsCache = new Map<string, { promise: Promise<Set<string>>; savedAt: number }>();

export function clearMorningHintsCache(): void {
  morningHintsCache.clear();
}

/** Limpia la caché de prioritarios (p. ej. tras pull-to-refresh). */
export function invalidateMorningAttendanceHints(tripDate?: string): void {
  if (tripDate) {
    morningHintsCache.delete(tripDate);
    return;
  }
  morningHintsCache.clear();
}

/** Alumnos que completaron recojo mañana (subió + bajó en colegio) ese día. */
export async function getMorningAttendanceHints(tripDate: string): Promise<Set<string>> {
  const cached = morningHintsCache.get(tripDate);
  if (cached && Date.now() - cached.savedAt < MORNING_HINTS_TTL_MS) {
    return cached.promise;
  }

  const promise = fetchMorningAttendanceHints(tripDate);
  morningHintsCache.set(tripDate, { promise, savedAt: Date.now() });
  void promise.catch(() => {
    morningHintsCache.delete(tripDate);
  });
  return promise;
}

async function fetchMorningAttendanceHints(tripDate: string): Promise<Set<string>> {
  const { data: trips, error: tripsError } = await supabase
    .from("bus_trips")
    .select("id")
    .eq("trip_date", tripDate)
    .eq("direction", "recojo")
    .eq("status", "completed");

  if (tripsError) {
    throw new Error("No se pudo consultar el recojo de la mañana.");
  }

  if (!trips?.length) {
    return new Set();
  }

  const tripIds = trips.map((trip) => trip.id);
  // ponytail: sin paginar, tope de 1000 filas por dia; paginar si hay varios buses grandes.
  const { data: records, error: recordsError } = await supabase
    .from("bus_attendance_records")
    .select("trip_id, student_id, event_type")
    .in("trip_id", tripIds)
    .is("voided_at", null);

  if (recordsError) {
    throw new Error("No se pudo consultar la asistencia de la mañana.");
  }

  const morningRiders = new Set<string>();

  for (const tripId of tripIds) {
    const eventsByStudent = new Map<string, AttendanceEventType[]>();

    for (const record of records ?? []) {
      if (record.trip_id !== tripId) {
        continue;
      }
      const history = eventsByStudent.get(record.student_id) ?? [];
      history.push(record.event_type);
      eventsByStudent.set(record.student_id, history);
    }

    for (const [studentId, events] of eventsByStudent) {
      const boarded = events.some((event) => isBoardingEvent(event));
      const dropped = events.some((event) => event === "bajo");
      if (boarded && dropped) {
        morningRiders.add(studentId);
      }
    }
  }

  return morningRiders;
}
