import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { WebView } from "react-native-webview";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { buildParentOsmMapHtml } from "@/src/features/parent/domain/parent-osm-map-html";
import { DEFAULT_MAP_REGION } from "@/src/features/trips/domain/location.constants";
import { formatLocationAge } from "@/src/features/trips/domain/location-labels";
import type { ParentBusLocation } from "@/src/features/parent/types/bus-location";

type ParentBusOsmMapProps = {
  locations: ParentBusLocation[];
  selectedTripId: string | null;
};

export function ParentBusOsmMap({ locations, selectedTripId }: ParentBusOsmMapProps) {
  const { colors, tokens } = useAppTheme();

  const selectedLocation =
    locations.find((location) => location.tripId === selectedTripId) ?? locations[0] ?? null;

  const focusLat = selectedLocation?.lat ?? DEFAULT_MAP_REGION.latitude;
  const focusLng = selectedLocation?.lng ?? DEFAULT_MAP_REGION.longitude;

  const mapHtml = useMemo(
    () => buildParentOsmMapHtml(locations, focusLat, focusLng),
    [locations, focusLat, focusLng],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          minHeight: 0,
          borderRadius: tokens.radius.xl,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          backgroundColor: colors.surfaceCard,
        },
        mapClip: {
          ...StyleSheet.absoluteFillObject,
          borderRadius: tokens.radius.xl,
          overflow: "hidden",
        },
        map: {
          flex: 1,
          backgroundColor: colors.surfaceTrack,
        },
        footer: {
          position: "absolute",
          left: tokens.spacing.md,
          right: tokens.spacing.md,
          bottom: tokens.spacing.md,
          backgroundColor: colors.surfaceCard,
          borderRadius: tokens.radius.lg,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          padding: tokens.spacing.md,
          gap: tokens.spacing.xs,
          elevation: 4,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
        },
        footerTitle: {
          ...tokens.typography.bodyStrong,
          color: colors.textTitle,
        },
        footerMeta: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        attribution: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
      }),
    [colors, tokens],
  );

  return (
    <View style={styles.container}>
      <View style={styles.mapClip} collapsable={false}>
        <WebView
          style={styles.map}
          originWhitelist={["*"]}
          source={{ html: mapHtml }}
          scrollEnabled={false}
          setSupportMultipleWindows={false}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>

      {selectedLocation ? (
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>
            {selectedLocation.studentNames.length === 1
              ? selectedLocation.studentNames[0]
              : `${selectedLocation.studentNames.length} hijos en este bus`}
          </Text>
          <Text style={styles.footerMeta}>
            {formatLocationAge(selectedLocation.lastLocationAt)}
          </Text>
          <Text style={styles.attribution}>OpenStreetMap · gratis</Text>
        </View>
      ) : null}
    </View>
  );
}
