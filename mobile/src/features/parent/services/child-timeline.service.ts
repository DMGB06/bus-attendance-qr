import { supabase } from "@/src/core/config/supabase";
import { getTodayDateIso } from "@/src/features/parent/utils/date";
import { isUuid } from "@/src/shared/utils/uuid";
import type { ChildTimelineEvent } from "@/src/features/parent/types";
import type { Trip } from "@/src/features/trips/types";

export async function getChildTimelineToday(studentId: string): Promise<ChildTimelineEvent[]> {
  if (!isUuid(studentId)) {
    return [];
  }
  const today = getTodayDateIso();

  const { data: records, error: recordsError } = await supabase
    .from("bus_attendance_records")
    .select("id, event_type, scanned_at, trip_id, voided_at")
    .eq("student_id", studentId)
    .is("voided_at", null)
    .order("scanned_at", { ascending: false });

  if (recordsError) {
    throw new Error("No se pudo cargar el historial del día.");
  }

  const tripIds = [...new Set((records ?? []).map((record) => record.trip_id))];

  if (!tripIds.length) {
    return [];
  }

  const { data: trips, error: tripsError } = await supabase
    .from("bus_trips")
    .select("id, direction, turn_type, trip_date")
    .in("id", tripIds)
    .eq("trip_date", today);

  if (tripsError) {
    throw new Error("No se pudieron cargar los viajes del día.");
  }

  const tripMap = new Map((trips ?? []).map((trip) => [trip.id, trip as Trip]));

  return (records ?? [])
    .filter((record) => tripMap.has(record.trip_id))
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
    });
}
