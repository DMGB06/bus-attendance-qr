import { supabase } from "@/src/core/config/supabase";
import { getUser } from "@/src/features/auth/services/auth.service";
import type { Trip, TripDirection } from "@/src/features/trips/types";

function formatSupabaseError(
  prefix: string,
  err: { message: string; details?: string; hint?: string; code?: string },
) {
  const parts = [err.message, err.details, err.hint].filter(Boolean);
  return `${prefix}${parts.length ? `: ${parts.join(" — ")}` : ""}${err.code ? ` [${err.code}]` : ""}`;
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

async function getAuthenticatedOperatorId() {
  const user = await getUser();

  if (!user) {
    throw new Error("Debes iniciar sesión para continuar.");
  }

  return user.id;
}

async function getAnyActiveTripByOperator(operatorId: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from("bus_trips")
    .select("*")
    .eq("operator_id", operatorId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(formatSupabaseError("No se pudo validar si existe un viaje activo", error));
  }

  return data;
}

async function validateCompletedOutboundTrip(operatorId: string, tripDate: string) {
  const { data, error } = await supabase
    .from("bus_trips")
    .select("id")
    .eq("operator_id", operatorId)
    .eq("trip_date", tripDate)
    .eq("direction", "recojo")
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(formatSupabaseError("No se pudo validar el recojo del día", error));
  }

  if (!data) {
    throw new Error("Debes completar el viaje de recojo antes de iniciar el retorno.");
  }
}

export async function startTrip(direction: TripDirection): Promise<Trip> {
  const operatorId = await getAuthenticatedOperatorId();
  const tripDate = getTodayDate();

  const activeTrip = await getAnyActiveTripByOperator(operatorId);
  if (activeTrip) {
    throw new Error("Ya tienes un viaje activo. Ciérralo antes de iniciar otro.");
  }

  if (direction === "retorno") {
    await validateCompletedOutboundTrip(operatorId, tripDate);
  }

  const { data, error } = await supabase
    .from("bus_trips")
    .insert({
      direction,
      status: "active",
      started_at: new Date().toISOString(),
      operator_id: operatorId,
      trip_date: tripDate,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(
      error
        ? formatSupabaseError("No se pudo iniciar el viaje", error)
        : "No se pudo iniciar el viaje.",
    );
  }

  return data;
}

export async function getActiveTripByOperator(): Promise<Trip | null> {
  const operatorId = await getAuthenticatedOperatorId();
  return getAnyActiveTripByOperator(operatorId);
}

export async function closeTrip(tripId: string): Promise<void> {
  const { error } = await supabase
    .from("bus_trips")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
    })
    .eq("id", tripId);

  if (error) {
    throw new Error(formatSupabaseError("No se pudo cerrar el viaje", error));
  }
}

