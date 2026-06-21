import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Text } from "react-native-paper";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { DEFAULT_MAP_REGION } from "@/src/features/trips/domain/location.constants";
import { formatLocationAge } from "@/src/features/trips/domain/location-labels";
import type { ParentBusLocation } from "@/src/features/parent/types/bus-location";

const MAP_FOOTER_INSET = 96;

type ParentBusAppleMapProps = {
  locations: ParentBusLocation[];
  selectedTripId: string | null;
};

export function ParentBusAppleMap({ locations, selectedTripId }: ParentBusAppleMapProps) {
  const { colors, tokens } = useAppTheme();

  const selectedLocation =
    locations.find((location) => location.tripId === selectedTripId) ?? locations[0] ?? null;

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
          ...StyleSheet.absoluteFillObject,
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
      }),
    [colors, tokens],
  );

  const region = selectedLocation
    ? {
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      }
    : DEFAULT_MAP_REGION;

  return (
    <View style={styles.container}>
      <View style={styles.mapClip} collapsable={false}>
        <MapView
          style={styles.map}
          initialRegion={region}
          region={region}
          mapPadding={{
            top: tokens.spacing.sm,
            right: tokens.spacing.sm,
            bottom: MAP_FOOTER_INSET,
            left: tokens.spacing.sm,
          }}
        >
          {locations.map((location) => (
            <Marker
              key={location.tripId}
              coordinate={{ latitude: location.lat, longitude: location.lng }}
              title="Bus escolar"
              description={location.studentNames.join(", ")}
            />
          ))}
        </MapView>
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
        </View>
      ) : null}
    </View>
  );
}
