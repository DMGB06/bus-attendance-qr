import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { formatLocationAge } from "@/src/features/trips/domain/location-labels";
import type { ParentBusLocation } from "@/src/features/parent/types/bus-location";

type ParentBusMapProps = {
  locations: ParentBusLocation[];
  selectedTripId: string | null;
};

export function ParentBusMap({ locations, selectedTripId }: ParentBusMapProps) {
  const { colors, tokens } = useAppTheme();

  const selectedLocation =
    locations.find((location) => location.tripId === selectedTripId) ?? locations[0] ?? null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: tokens.spacing.lg,
          borderRadius: tokens.radius.xl,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          backgroundColor: colors.surfaceCard,
          gap: tokens.spacing.sm,
        },
        title: {
          ...tokens.typography.bodyStrong,
          color: colors.textTitle,
          textAlign: "center",
        },
        body: {
          ...tokens.typography.body,
          color: colors.textBody,
          textAlign: "center",
        },
        meta: {
          ...tokens.typography.caption,
          color: colors.textMuted,
          textAlign: "center",
        },
      }),
    [colors, tokens],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mapa en vivo</Text>
      <Text style={styles.body}>
        El mapa interactivo está disponible en la app Android. En el navegador puedes ver el
        estado del viaje en la pestaña Inicio.
      </Text>
      {selectedLocation ? (
        <>
          <Text style={styles.meta}>
            {selectedLocation.studentNames.join(", ")} ·{" "}
            {formatLocationAge(selectedLocation.lastLocationAt)}
          </Text>
          <Text style={styles.meta}>
            Última posición: {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
          </Text>
        </>
      ) : null}
    </View>
  );
}
