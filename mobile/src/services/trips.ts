// src/services/trips.ts

import { supabase } from "@/src/lib/supabase";
import type { Trip, TripDirection } from "@/src/types";

export async function createTrip(direction: TripDirection): Promise<Trip> {
  const { data, error } = await supabase
    .from("bus_trips")
    .insert({
      direction,
      status: "active",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo iniciar el viaje.");
  }

  return data;
}

export async function closeTrip(tripId: string): Promise<boolean> {
  const { error } = await supabase
    .from("bus_trips")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
    })
    .eq("id", tripId);

  return !error;
}
