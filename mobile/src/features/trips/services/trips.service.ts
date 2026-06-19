import { supabase } from "@/src/core/config/supabase";
import { getCapabilitiesForRole } from "@/src/features/auth/domain/permissions";
import { getUser } from "@/src/features/auth/services/auth.service";
import { getProfileById } from "@/src/features/profile/services/profile.service";
import {
  getAssignedBusForToday,
  resolveOperationalBusContext,
  type OperationalBusContext,
} from "@/src/features/trips/services/crew.service";
import { isUuid } from "@/src/shared/utils/uuid";
import type { Trip, TurnType } from "@/src/features/trips/types";

function formatSupabaseError(
  prefix: string,
  err: { message: string; details?: string; hint?: string; code?: string },
) {
  const parts = [err.message, err.details, err.hint].filter(Boolean);
  return `${prefix}${parts.length ? `: ${parts.join(" — ")}` : ""}${err.code ? ` [${err.code}]` : ""}`;
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

  const { data, error } = await supabase.rpc("start_trip", {
    p_turn_type: turnType,
  });

  if (error || !data) {
    throw new Error(
      error
        ? formatSupabaseError("No se pudo iniciar el viaje", error)
        : "No se pudo iniciar el viaje.",
    );
  }

  return data as Trip;
}

export function isTripAlreadyClosedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Viaje no encontrado o ya cerrado");
}

export async function closeTrip(tripId: string): Promise<void> {
  if (!isUuid(tripId)) {
    throw new Error("Identificador de viaje inválido.");
  }

  const userId = await getAuthenticatedUserId();
  await assertCanCloseTrip(userId);

  const { error } = await supabase.rpc("close_trip", {
    p_trip_id: tripId,
  });

  if (error) {
    throw new Error(formatSupabaseError("No se pudo cerrar el viaje", error));
  }
}
