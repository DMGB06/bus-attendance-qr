import { useMemo } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { buildOsmExternalUrl } from "@/src/features/parent/domain/parent-osm-map-html";
import { formatLocationAge } from "@/src/features/trips/domain/location-labels";
import type { ParentBusLocation } from "@/src/features/parent/types/bus-location";

type ParentBusLocationSummaryProps = {
  locations: ParentBusLocation[];
  selectedTripId: string | null;
  needsDevRebuild?: boolean;
};

export function ParentBusLocationSummary({
  locations,
  selectedTripId,
  needsDevRebuild = false,
}: ParentBusLocationSummaryProps) {
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
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          backgroundColor: colors.surfaceCard,
          padding: tokens.spacing.lg,
          gap: tokens.spacing.md,
          justifyContent: "center",
        },
        iconWrap: {
          alignSelf: "center",
          width: 72,
          height: 72,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.primarySoftBg,
          alignItems: "center",
          justifyContent: "center",
        },
        title: {
          ...tokens.typography.title3,
          color: colors.textTitle,
          textAlign: "center",
        },
        meta: {
          ...tokens.typography.body,
          color: colors.textBody,
          textAlign: "center",
        },
        coords: {
          ...tokens.typography.caption,
          color: colors.textMuted,
          textAlign: "center",
        },
        button: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: tokens.spacing.sm,
          backgroundColor: colors.primary,
          borderRadius: tokens.radius.md,
          paddingVertical: tokens.spacing.md,
          paddingHorizontal: tokens.spacing.lg,
        },
        buttonText: {
          ...tokens.typography.bodyStrong,
          color: colors.textOnPrimary,
        },
        hint: {
          ...tokens.typography.caption,
          color: colors.textMuted,
          textAlign: "center",
        },
      }),
    [colors, tokens],
  );

  if (!selectedLocation) {
    return null;
  }

  const openOsm = () => {
    void Linking.openURL(
      buildOsmExternalUrl(selectedLocation.lat, selectedLocation.lng),
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="bus-marker" size={36} color={colors.primary} />
      </View>

      <Text style={styles.title}>
        {selectedLocation.studentNames.length === 1
          ? selectedLocation.studentNames[0]
          : `${selectedLocation.studentNames.length} hijos en este bus`}
      </Text>

      <Text style={styles.meta}>{formatLocationAge(selectedLocation.lastLocationAt)}</Text>
      <Text style={styles.coords}>
        {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
      </Text>

      <Pressable
        onPress={openOsm}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel="Abrir ubicación en OpenStreetMap"
      >
        <MaterialCommunityIcons name="map-marker-radius" size={20} color={colors.textOnPrimary} />
        <Text style={styles.buttonText}>Ver en mapa (gratis)</Text>
      </Pressable>

      <Text style={styles.hint}>
        {needsDevRebuild
          ? "Para ver el mapa aquí dentro: npx expo run:android (una vez). Mientras tanto, usa el botón."
          : "OpenStreetMap · sin costo ni API key"}
      </Text>
    </View>
  );
}
