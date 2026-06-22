import { hasValidCoordinates } from "@/src/features/trips/domain/location-labels";
import { getParentChildrenWithStatus } from "@/src/features/parent/services/parent-children.service";
import type { ParentChildSummary } from "@/src/features/parent/types";
import type { ParentBusLocation } from "@/src/features/parent/types/bus-location";

export type ParentBusLocationSnapshot = {
  locations: ParentBusLocation[];
  hasActiveTrip: boolean;
  waitingForGps: boolean;
  activeTripIds: string[];
};

export function buildBusLocationSnapshotFromChildren(
  children: ParentChildSummary[],
): ParentBusLocationSnapshot {
  const activeChildren = children.filter((child) => child.activeTrip?.status === "active");
  const locationMap = new Map<string, ParentBusLocation>();

  for (const child of activeChildren) {
    const trip = child.activeTrip!;

    if (!hasValidCoordinates(trip.last_lat, trip.last_lng) || !trip.last_location_at) {
      continue;
    }

    const existing = locationMap.get(trip.id);

    if (existing) {
      existing.studentNames.push(child.student.nombre_alumno);
      continue;
    }

    locationMap.set(trip.id, {
      tripId: trip.id,
      lat: trip.last_lat,
      lng: trip.last_lng,
      lastLocationAt: trip.last_location_at,
      direction: trip.direction,
      status: trip.status,
      studentNames: [child.student.nombre_alumno],
    });
  }

  const locations = [...locationMap.values()];
  const activeTripIds = [...new Set(activeChildren.map((child) => child.activeTrip!.id))];

  return {
    locations,
    hasActiveTrip: activeChildren.length > 0,
    waitingForGps: activeChildren.length > 0 && locations.length === 0,
    activeTripIds,
  };
}

export async function getParentBusLocationSnapshot(
  userId: string,
): Promise<ParentBusLocationSnapshot> {
  const children = await getParentChildrenWithStatus(userId);
  return buildBusLocationSnapshotFromChildren(children);
}
