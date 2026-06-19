import { supabase } from "@/src/core/config/supabase";
import { getUser } from "@/src/features/auth/services/auth.service";
import { getProfileById } from "@/src/features/profile/services/profile.service";
import { AppRole } from "@/src/features/profile/types";

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

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

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

async function getDefaultBusUnit(): Promise<BusUnit | null> {
  const pilotBus = await getSingleActivePilotBus();
  if (pilotBus) {
    return pilotBus;
  }

  const { data, error } = await supabase
    .from("bus_units")
    .select("id, code, plate, label, is_active")
    .eq("code", "BUS-01")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error("No se pudo consultar la unidad BUS-01.");
  }

  return data as BusUnit | null;
}

async function resolvePilotAssignment(
  userId: string,
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

  const today = getTodayDate();
  const { data: assignment, error } = await supabase
    .from("bus_crew_assignments")
    .select("bus_id, crew_role")
    .eq("user_id", uid)
    .eq("assignment_date", today)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("No se pudo consultar la asignación de bus.");
  }

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
  return resolvePilotAssignment(uid, profile?.app_role ?? null);
}

export async function getCrewForBus(
  busId: string,
  assignmentDate = getTodayDate(),
): Promise<CrewAssignment[]> {
  const { data, error } = await supabase
    .from("bus_crew_assignments")
    .select("id, bus_id, user_id, crew_role, assignment_date, is_active")
    .eq("bus_id", busId)
    .eq("assignment_date", assignmentDate)
    .eq("is_active", true);

  if (error) {
    throw new Error("No se pudo consultar el crew del bus.");
  }

  return (data ?? []) as CrewAssignment[];
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

  if (appRole === AppRole.PADRE) {
    return null;
  }

  const pilotAssignment = await resolvePilotAssignment(uid, appRole);
  if (pilotAssignment) {
    return {
      busId: pilotAssignment.bus.id,
      busCode: pilotAssignment.bus.code,
      busLabel: pilotAssignment.bus.label,
      crewRole: pilotAssignment.crewRole,
      appRole,
    };
  }

  const defaultBus = await getDefaultBusUnit();
  if (!defaultBus) {
    return null;
  }

  return {
    busId: defaultBus.id,
    busCode: defaultBus.code,
    busLabel: defaultBus.label,
    crewRole: crewRoleForAppRole(appRole),
    appRole,
  };
}

export async function getScanContextForCurrentUser(): Promise<ScanContext> {
  const user = await getUser();
  if (!user) {
    throw new Error("Debes iniciar sesión para registrar asistencia.");
  }

  const assignment = await getAssignedBusForToday(user.id);
  if (assignment?.crewRole) {
    return { scannedBy: user.id, scanRole: assignment.crewRole };
  }

  const profile = await getProfileById(user.id);
  if (profile?.app_role === AppRole.ASISTENTA) {
    return { scannedBy: user.id, scanRole: "asistenta" };
  }

  return { scannedBy: user.id, scanRole: "chofer" };
}
