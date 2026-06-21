import { Platform } from "react-native";

import { ParentBusAppleMap } from "@/src/features/parent/components/ParentBusAppleMap";
import { ParentBusLocationSummary } from "@/src/features/parent/components/ParentBusLocationSummary";
import { ParentBusWebOsmMap } from "@/src/features/parent/components/ParentBusWebOsmMap";
import { isNativeWebViewAvailable } from "@/src/features/parent/domain/parent-native-webview";
import type { ParentBusLocation } from "@/src/features/parent/types/bus-location";

type ParentBusMapProps = {
  locations: ParentBusLocation[];
  selectedTripId: string | null;
};

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
    const { ParentBusOsmMap } =
      require("@/src/features/parent/components/ParentBusOsmMap") as typeof import("@/src/features/parent/components/ParentBusOsmMap");
    return <ParentBusOsmMap {...props} />;
  }

  return <ParentBusLocationSummary {...props} needsDevRebuild />;
}
