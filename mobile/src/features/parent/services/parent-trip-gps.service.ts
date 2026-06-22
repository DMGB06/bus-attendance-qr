import { supabase } from "@/src/core/config/supabase";
import { filterValidUuids } from "@/src/shared/utils/uuid";
import type { Trip } from "@/src/features/trips/types";

/** Actualiza solo coordenadas GPS de viajes activos (mucho más liviano que recargar hijos). */
export async function fetchActiveTripGpsByIds(tripIds: string[]): Promise<Trip[]> {
  const validIds = filterValidUuids(tripIds);
  if (!validIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("bus_trips")
    .select(
      "id, bus_id, trip_date, direction, turn_type, status, started_at, closed_at, last_lat, last_lng, last_location_at",
    )
    .in("id", validIds)
    .eq("status", "active");

  if (error) {
    throw new Error("No se pudo actualizar la ubicación del bus.");
  }

  return (data ?? []) as Trip[];
}
