import { AppRole } from "@/src/features/profile/types";

export type AppCapabilities = {
  canStartTrip: boolean;
  canCloseTrip: boolean;
  canScan: boolean;
  canViewRoster: boolean;
  canBulkDropoff: boolean;
  canMarkManual: boolean;
  isAssistant: boolean;
  isDriver: boolean;
};

const CHOFER_CAPABILITIES: AppCapabilities = {
  canStartTrip: true,
  canCloseTrip: true,
  canScan: true,
  canViewRoster: true,
  canBulkDropoff: true,
  canMarkManual: true,
  isAssistant: false,
  isDriver: true,
};

const ASISTENTA_CAPABILITIES: AppCapabilities = {
  canStartTrip: false,
  canCloseTrip: false,
  canScan: true,
  canViewRoster: true,
  canBulkDropoff: false,
  canMarkManual: true,
  isAssistant: true,
  isDriver: false,
};

const NO_OPS_CAPABILITIES: AppCapabilities = {
  canStartTrip: false,
  canCloseTrip: false,
  canScan: false,
  canViewRoster: false,
  canBulkDropoff: false,
  canMarkManual: false,
  isAssistant: false,
  isDriver: false,
};

/** Permisos neutros mientras se resuelve el rol — evita flash de UI de chofer. */
export const LOADING_CAPABILITIES: AppCapabilities = NO_OPS_CAPABILITIES;

export function getCapabilitiesForRole(appRole: AppRole | null | undefined): AppCapabilities {
  switch (appRole) {
    case AppRole.CHOFER:
    case AppRole.COORDINADOR:
      return CHOFER_CAPABILITIES;
    case AppRole.ASISTENTA:
      return ASISTENTA_CAPABILITIES;
    case AppRole.PADRE:
      return NO_OPS_CAPABILITIES;
    default:
      // Sin rol asignado (V1): operador con permisos de chofer.
      return CHOFER_CAPABILITIES;
  }
}

export function isParentRole(appRole: AppRole | null | undefined): boolean {
  return appRole === AppRole.PADRE;
}

export function isOpsRole(appRole: AppRole | null | undefined): boolean {
  return (
    appRole === AppRole.CHOFER ||
    appRole === AppRole.ASISTENTA ||
    appRole === AppRole.COORDINADOR
  );
}
