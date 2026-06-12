import type { TripDirection, TripStatus } from "@/src/features/trips/types";

export type ParentBusLocation = {
  tripId: string;
  lat: number;
  lng: number;
  lastLocationAt: string;
  direction: TripDirection;
  status: TripStatus;
  studentNames: string[];
};
