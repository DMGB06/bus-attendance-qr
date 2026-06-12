import { supabase } from "@/src/core/config/supabase";
import { getUser } from "@/src/features/auth/services/auth.service";
import type { TripLocationPoint } from "@/src/features/trips/types";

type PublishLocationInput = {
  tripId: string;
  lat: number;
  lng: number;
};

export async function publishDriverLocation({
  tripId,
  lat,
  lng,
}: PublishLocationInput): Promise<void> {
  const user = await getUser();

  if (!user) {
    throw new Error("Debes iniciar sesión para publicar ubicación.");
  }

  const recordedAt = new Date().toISOString();

  const { error: insertError } = await supabase.from("bus_trip_locations").insert({
    trip_id: tripId,
    lat,
    lng,
    recorded_at: recordedAt,
    recorded_by: user.id,
  });

  if (insertError) {
    throw new Error("No se pudo guardar el punto GPS del viaje.");
  }

  const { error: updateError } = await supabase
    .from("bus_trips")
    .update({
      last_lat: lat,
      last_lng: lng,
      last_location_at: recordedAt,
    })
    .eq("id", tripId)
    .eq("status", "active");

  if (updateError) {
    throw new Error("No se pudo actualizar la ubicación del viaje.");
  }
}

export async function getLatestTripLocation(tripId: string): Promise<TripLocationPoint | null> {
  const { data, error } = await supabase
    .from("bus_trip_locations")
    .select("*")
    .eq("trip_id", tripId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("No se pudo consultar la ubicación del bus.");
  }

  return (data as TripLocationPoint | null) ?? null;
}
