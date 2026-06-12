import { useTripLocationPublisher } from "@/src/features/trips/hooks/useTripLocationPublisher";

export function TripLocationPublisherSync() {
  useTripLocationPublisher();
  return null;
}
