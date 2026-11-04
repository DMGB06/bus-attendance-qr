export type TripPrimaryAction = "scan" | "bulk" | "close";

/** El boton principal de Viaje sigue el paso en que va el recorrido. */
export function getTripPrimaryAction(
  counts: { pendingCount: number; onboardCount: number },
  permissions: { canScan: boolean; canBulkDropoff: boolean; canCloseTrip: boolean },
): TripPrimaryAction | null {
  if (counts.pendingCount > 0 && permissions.canScan) {
    return "scan";
  }
  if (counts.onboardCount > 0 && permissions.canBulkDropoff) {
    return "bulk";
  }
  return permissions.canCloseTrip ? "close" : null;
}
