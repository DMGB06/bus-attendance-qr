import { supabase } from "@/src/core/config/supabase";
import { getUser } from "@/src/features/auth/services/auth.service";
import { getProfileById } from "@/src/features/profile/services/profile.service";
import { AppRole } from "@/src/features/profile/types";
import { getLocalTodayDateIso } from "@/src/shared/utils/local-date";

export type CrewRole = "chofer" | "asistenta";

export type BusUnit = {
  id: string;
  code: string;
  plate: string | null;
  label: string;
  is_active: boolean;
};

export type CrewAssignment = {
  id: string;
  bus_id: string;
  user_id: string;
  crew_role: CrewRole;
  assignment_date: string;
  is_active: boolean;
};

export type OperationalBusContext = {
  busId: string;
  busCode: string;
  busLabel: string;
  crewRole: CrewRole | null;
  appRole: AppRole | null;
};

export type ScanContext = {
  scannedBy: string;
  scanRole: CrewRole | null;
};

function isOperatorAppRole(role: AppRole | null | undefined): boolean {
  return role === AppRole.CHOFER || role === AppRole.ASISTENTA || role === AppRole.COORDINADOR;
}

function crewRoleForAppRole(role: AppRole | null | undefined): CrewRole {
  return role === AppRole.ASISTENTA ? "asistenta" : "chofer";
}

/** Piloto Cerro Azul: exactamente 1 bus_units activo (alineado con migración 020). */
export async function isSingleBusPilotMode(): Promise<boolean> {
  const { data, error } = await supabase
    .from("bus_units")
    .select("id")
    .eq("is_active", true);

  if (error) {
    return false;
  }

  return (data?.length ?? 0) === 1;
}

async function getSingleActivePilotBus(): Promise<BusUnit | null> {
  const { data, error } = await supabase
    .from("bus_units")
    .select("id, code, plate, label, is_active")
    .eq("is_active", true)
    .order("code")
    .limit(2);

  if (error || !data || data.length !== 1) {
    return null;
  }

  return data[0] as BusUnit;
}

async function resolvePilotAssignment(
  appRole: AppRole | null,
): Promise<{ bus: BusUnit; crewRole: CrewRole } | null> {
  if (!isOperatorAppRole(appRole)) {
    return null;
  }

  const pilotBus = await getSingleActivePilotBus();
  if (!pilotBus) {
    return null;
  }

  return {
    bus: pilotBus,
    crewRole: crewRoleForAppRole(appRole),
  };
}

export async function getAssignedBusForToday(userId?: string): Promise<{
  bus: BusUnit;
  crewRole: CrewRole;
} | null> {
  const uid = userId ?? (await getUser())?.id;
  if (!uid) {
    return null;
  }

  const today = getLocalTodayDateIso();
  const { data: assignments, error } = await supabase
    .from("bus_crew_assignments")
    .select("bus_id, crew_role")
    .eq("user_id", uid)
    .eq("assignment_date", today)
    .eq("is_active", true);

  if (error) {
    throw new Error("No se pudo consultar la asignación de bus.");
  }

  // Mismo criterio que get_user_bus_id_today: chofer primero.
  const assignment =
    assignments?.find((row) => row.crew_role === "chofer") ?? assignments?.[0] ?? null;

  if (assignment) {
    const { data: bus, error: busError } = await supabase
      .from("bus_units")
      .select("id, code, plate, label, is_active")
      .eq("id", assignment.bus_id)
      .maybeSingle();

    if (busError) {
      throw new Error("No se pudo consultar la unidad asignada.");
    }

    if (!bus) {
      return null;
    }

    return {
      bus: bus as BusUnit,
      crewRole: assignment.crew_role as CrewRole,
    };
  }

  const profile = await getProfileById(uid);
  return resolvePilotAssignment(profile?.app_role ?? null);
}

export async function resolveOperationalBusContext(
  userId?: string,
): Promise<OperationalBusContext | null> {
  const uid = userId ?? (await getUser())?.id;
  if (!uid) {
    return null;
  }

  const [assignment, profile] = await Promise.all([
    getAssignedBusForToday(uid),
    getProfileById(uid),
  ]);

  const appRole = profile?.app_role ?? null;

  if (assignment) {
    return {
      busId: assignment.bus.id,
      busCode: assignment.bus.code,
      busLabel: assignment.bus.label,
      crewRole: assignment.crewRole,
      appRole,
    };
  }

  return null;
}

export async function getScanContextForCurrentUser(): Promise<ScanContext> {
  const user = await getUser();
  if (!user) {
    throw new Error("Debes iniciar sesión para registrar asistencia.");
  }

  try {
    const assignment = await getAssignedBusForToday(user.id);
    if (assignment?.crewRole) {
      return { scannedBy: user.id, scanRole: assignment.crewRole };
    }
  } catch {
    /* sin red: se usa el perfil guardado */
  }

  try {
    const profile = await getProfileById(user.id, user);
    if (profile) {
      return { scannedBy: user.id, scanRole: crewRoleForAppRole(profile.app_role) };
    }
  } catch {
    /* sin red ni perfil guardado: el rol queda sin informar */
  }

  return { scannedBy: user.id, scanRole: null };
}
