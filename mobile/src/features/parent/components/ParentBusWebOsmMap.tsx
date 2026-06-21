import { useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { buildOsmEmbedUrl } from "@/src/features/parent/domain/parent-osm-map-html";
import { formatLocationAge } from "@/src/features/trips/domain/location-labels";
import type { ParentBusLocation } from "@/src/features/parent/types/bus-location";

type ParentBusWebOsmMapProps = {
  locations: ParentBusLocation[];
  selectedTripId: string | null;
};

export function ParentBusWebOsmMap({ locations, selectedTripId }: ParentBusWebOsmMapProps) {
  const { colors, tokens } = useAppTheme();

  const selectedLocation =
    locations.find((location) => location.tripId === selectedTripId) ?? locations[0] ?? null;

  const embedUrl = selectedLocation
    ? buildOsmEmbedUrl(selectedLocation.lat, selectedLocation.lng)
    : null;

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
          flex: 1,
          minHeight: 200,
          borderRadius: tokens.radius.xl,
          overflow: "hidden",
        },
        footer: {
          padding: tokens.spacing.md,
          gap: tokens.spacing.xs,
          borderTopWidth: 1,
          borderTopColor: colors.surfaceDivider,
        },
        footerTitle: {
          ...tokens.typography.bodyStrong,
          color: colors.textTitle,
        },
        footerMeta: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
      }),
    [colors, tokens],
  );

  if (Platform.OS !== "web" || !embedUrl || !selectedLocation) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapClip}>
        <iframe
          title="Ubicación del bus"
          src={embedUrl}
          style={{ width: "100%", height: "100%", border: 0, display: "block" }}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>
          {selectedLocation.studentNames.length === 1
            ? selectedLocation.studentNames[0]
            : `${selectedLocation.studentNames.length} hijos en este bus`}
        </Text>
        <Text style={styles.footerMeta}>
          {formatLocationAge(selectedLocation.lastLocationAt)} · OpenStreetMap
        </Text>
      </View>
    </View>
  );
}
