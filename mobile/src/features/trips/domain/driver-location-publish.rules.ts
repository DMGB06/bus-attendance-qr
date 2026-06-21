import type { AppStateStatus } from "react-native";

/** Tabs donde el chofer opera el viaje (GPS útil para apoderados). */
export const OPERATIONAL_OPS_TAB_NAMES = ["trip", "scanner", "roster"] as const;

export type OperationalOpsTabName = (typeof OPERATIONAL_OPS_TAB_NAMES)[number];

export function isOperationalOpsTab(tabName: string | undefined): tabName is OperationalOpsTabName {
  if (!tabName) {
    return false;
  }

  return (OPERATIONAL_OPS_TAB_NAMES as readonly string[]).includes(tabName);
}

export function shouldPublishDriverLocation(input: {
  isDriver: boolean;
  tripActive: boolean;
  appState: AppStateStatus;
  opsTabName: string | undefined;
}): boolean {
  return (
    input.isDriver &&
    input.tripActive &&
    input.appState === "active" &&
    isOperationalOpsTab(input.opsTabName)
  );
}
