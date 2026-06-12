import { supabase } from "@/src/core/config/supabase";
import { getCapabilitiesForRole } from "@/src/features/auth/domain/permissions";
import { getUser } from "@/src/features/auth/services/auth.service";
import { getProfileById } from "@/src/features/profile/services/profile.service";
import { AppRole } from "@/src/features/profile/types";
import { getDirectionForTurnType } from "@/src/features/trips/domain/trip-turn";
import {
  getAssignedBusForToday,
  resolveOperationalBusContext,
  type OperationalBusContext,
} from "@/src/features/trips/services/crew.service";
import type { Trip, TurnType } from "@/src/features/trips/types";

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

async function getAuthenticatedUserId() {
  const user = await getUser();

  if (!user) {
    throw new Error("Debes iniciar sesión para continuar.");
  }

  return user.id;
}

async function assertCanStartTrip(userId: string) {
  const profile = await getProfileById(userId);
  const capabilities = getCapabilitiesForRole(profile?.app_role);
  if (!capabilities.canStartTrip) {
    throw new Error("Solo el chofer puede iniciar el viaje.");
  }

  const assignment = await getAssignedBusForToday(userId);
  if (assignment?.crewRole === "asistenta") {
    throw new Error("Solo el chofer puede iniciar el viaje.");
  }
}

async function assertCanCloseTrip(userId: string) {
  const profile = await getProfileById(userId);
  const capabilities = getCapabilitiesForRole(profile?.app_role);
  if (!capabilities.canCloseTrip) {
    throw new Error("Solo el chofer puede cerrar el viaje.");
  }

  const assignment = await getAssignedBusForToday(userId);
  if (assignment?.crewRole === "asistenta") {
    throw new Error("Solo el chofer puede cerrar el viaje.");
  }
}

async function getActiveTripByBusId(busId: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from("bus_trips")
    .select("*")
    .eq("bus_id", busId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(formatSupabaseError("No se pudo validar si existe un viaje activo", error));
  }

  return data;
}

async function validateCompletedMorningRecojo(busId: string, tripDate: string) {
  const { data, error } = await supabase
    .from("bus_trips")
    .select("id")
    .eq("bus_id", busId)
    .eq("trip_date", tripDate)
    .eq("direction", "recojo")
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(formatSupabaseError("No se pudo validar el recojo del día", error));
  }

  if (!data) {
    throw new Error("Debes completar el viaje de recojo de la mañana antes de iniciar la tarde.");
  }
}

async function validateCompletedTurn(busId: string, tripDate: string, turnType: TurnType) {
  const { data, error } = await supabase
    .from("bus_trips")
    .select("id")
    .eq("bus_id", busId)
    .eq("trip_date", tripDate)
    .eq("turn_type", turnType)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(formatSupabaseError("No se pudo validar el tramo anterior", error));
  }

  if (!data) {
    throw new Error("Debes completar el viaje de tarde primaria antes de iniciar tarde secundaria.");
  }
}

async function validateCanStartTurn(busId: string, tripDate: string, turnType: TurnType) {
  const direction = getDirectionForTurnType(turnType);
  const validations: Promise<void>[] = [];

  if (direction === "retorno") {
    validations.push(validateCompletedMorningRecojo(busId, tripDate));
  }

  if (turnType === "tarde_secundaria") {
    validations.push(validateCompletedTurn(busId, tripDate, "tarde_primaria"));
  }

  await Promise.all(validations);
}

export async function getOperationalContext(): Promise<OperationalBusContext | null> {
  return resolveOperationalBusContext();
}

export async function getActiveTripForCurrentUser(): Promise<Trip | null> {
  const context = await resolveOperationalBusContext();
  if (!context) {
    return null;
  }

  return getActiveTripByBusId(context.busId);
}

/** @deprecated Usar getActiveTripForCurrentUser — conservado por compatibilidad interna. */
export async function getActiveTripByOperator(): Promise<Trip | null> {
  return getActiveTripForCurrentUser();
}

export async function startTrip(turnType: TurnType): Promise<Trip> {
  const userId = await getAuthenticatedUserId();
  await assertCanStartTrip(userId);

  const context = await resolveOperationalBusContext();
  if (!context) {
    const profile = await getProfileById(userId);
    if (profile?.app_role === AppRole.ASISTENTA) {
      throw new Error("No tienes un bus asignado para hoy. Contacta al coordinador.");
    }
    throw new Error("No se encontró una unidad de bus disponible.");
  }

  const tripDate = getTodayDate();
  const direction = getDirectionForTurnType(turnType);

  const [activeTrip] = await Promise.all([
    getActiveTripByBusId(context.busId),
    validateCanStartTurn(context.busId, tripDate, turnType),
  ]);

  if (activeTrip) {
    throw new Error("Ya hay un viaje activo en esta unidad. Ciérralo antes de iniciar otro.");
  }

  const { data, error } = await supabase
    .from("bus_trips")
    .insert({
      direction,
      turn_type: turnType,
      status: "active",
      started_at: new Date().toISOString(),
      operator_id: userId,
      started_by: userId,
      bus_id: context.busId,
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

export async function closeTrip(tripId: string): Promise<void> {
  const userId = await getAuthenticatedUserId();
  await assertCanCloseTrip(userId);

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
