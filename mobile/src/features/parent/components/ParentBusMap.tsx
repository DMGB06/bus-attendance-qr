import { lazy, Suspense } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";

import { ParentBusAppleMap } from "@/src/features/parent/components/ParentBusAppleMap";
import { ParentBusLocationSummary } from "@/src/features/parent/components/ParentBusLocationSummary";
import { ParentBusWebOsmMap } from "@/src/features/parent/components/ParentBusWebOsmMap";
import { isNativeWebViewAvailable } from "@/src/features/parent/domain/parent-native-webview";
import type { ParentBusLocation } from "@/src/features/parent/types/bus-location";

const ParentBusOsmMap = lazy(() =>
  import("@/src/features/parent/components/ParentBusOsmMap").then((module) => ({
    default: module.ParentBusOsmMap,
  })),
);

type ParentBusMapProps = {
  locations: ParentBusLocation[];
  selectedTripId: string | null;
};

function OsmMapFallback() {
  return (
    <View style={styles.mapFallback}>
      <ActivityIndicator size="large" />
    </View>
  );
}

/**
 * Mapa dentro de la app — gratis, sin Google Maps API key.
 * - iOS: Apple Maps
 * - Web: OSM embebido (iframe)
 * - Android: OSM en WebView (tras rebuild) o botón a OSM si el dev build es viejo
 */
export function ParentBusMap(props: ParentBusMapProps) {
  if (Platform.OS === "ios") {
    return <ParentBusAppleMap {...props} />;
  }

  if (Platform.OS === "web") {
    return <ParentBusWebOsmMap {...props} />;
  }

  if (isNativeWebViewAvailable()) {
    return (
      <Suspense fallback={<OsmMapFallback />}>
        <ParentBusOsmMap {...props} />
      </Suspense>
    );
  }

  return <ParentBusLocationSummary {...props} needsDevRebuild />;
}

const styles = StyleSheet.create({
  mapFallback: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
  },
});
