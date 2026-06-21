import { useMemo } from "react";
import { useSegments } from "expo-router";

import { useTripLocationPublisher } from "@/src/features/trips/hooks/useTripLocationPublisher";

function getOpsTabNameFromSegments(segments: readonly string[]): string | undefined {
  const tabsIndex = segments.indexOf("(tabs)");

  if (tabsIndex === -1) {
    return undefined;
  }

  return segments[tabsIndex + 1];
}

export function TripLocationPublisherSync() {
  const segments = useSegments();
  const opsTabName = useMemo(() => getOpsTabNameFromSegments(segments), [segments]);

  useTripLocationPublisher({ opsTabName });

  return null;
}
