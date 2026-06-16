import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { useScrollBottomPadding } from "@/src/core/theme/useScrollBottomPadding";
import { ParentBusMap } from "@/src/features/parent/components/ParentBusMap";
import { ParentMapEmptyState } from "@/src/features/parent/components/ParentMapEmptyState";
import { useParentBusLocations } from "@/src/features/parent/hooks/useParentBusLocations";
import { AppScrollView } from "@/src/shared/ui/AppScrollView";

export default function ParentMapScreen() {
  const { colors, tokens } = useAppTheme();
  const scrollBottom = useScrollBottomPadding(tokens.spacing.md);
  const { locations, loading, refreshing, error, hasActiveTrip, waitingForGps, refresh } =
    useParentBusLocations();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const effectiveSelectedTripId = selectedTripId ?? locations[0]?.tripId ?? null;

  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: colors.screenSolid,
        },
        loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        },
        content: {
          flex: 1,
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.md,
          gap: tokens.spacing.md,
        },
        intro: {
          gap: tokens.spacing.xs,
        },
        title: {
          ...tokens.typography.title2,
          color: colors.textTitle,
        },
        subtitle: {
          ...tokens.typography.body,
          color: colors.textBody,
        },
        selectorRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: tokens.spacing.sm,
        },
        chip: {
          borderRadius: tokens.radius.full,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.xs,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          backgroundColor: colors.surfaceCard,
        },
        chipSelected: {
          backgroundColor: colors.primarySoftBg,
          borderColor: colors.primary,
        },
        chipText: {
          ...tokens.typography.caption,
          color: colors.textBody,
        },
        chipTextSelected: {
          color: colors.primarySoftText,
        },
        mapWrap: {
          flex: 1,
          minHeight: 0,
        },
        error: {
          ...tokens.typography.body,
          color: colors.feedbackError,
        },
      }),
    [colors, tokens],
  );

  if (loading) {
    return (
      <SafeAreaView edges={["bottom", "left", "right"]} style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating size={36} color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!hasActiveTrip) {
    return (
      <SafeAreaView edges={["bottom", "left", "right"]} style={styles.safeArea}>
        <AppScrollView
          contentContainerStyle={styles.content}
          extraBottomInset={tokens.spacing.lg}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.intro}>
            <Text style={styles.title}>Ubicación del bus</Text>
            <Text style={styles.subtitle}>
              Solo verás el mapa cuando tu hijo esté en un viaje activo con GPS publicado.
            </Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <ParentMapEmptyState
            title="Bus no en recorrido"
            message="Cuando el chofer inicie el viaje y comparta ubicación, verás aquí la posición aproximada del bus."
          />
        </AppScrollView>
      </SafeAreaView>
    );
  }

  if (waitingForGps || !locations.length) {
    return (
      <SafeAreaView edges={["bottom", "left", "right"]} style={styles.safeArea}>
        <AppScrollView
          contentContainerStyle={styles.content}
          extraBottomInset={tokens.spacing.lg}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.intro}>
            <Text style={styles.title}>Ubicación del bus</Text>
            <Text style={styles.subtitle}>Viaje activo — esperando la primera señal GPS del chofer.</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <ParentMapEmptyState
            title="Esperando ubicación"
            message="El bus está en recorrido. En cuanto el chofer comparta GPS, el mapa se actualizará automáticamente."
          />
        </AppScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={styles.safeArea}>
      <View style={[styles.content, { paddingBottom: scrollBottom }]}>
        <View style={styles.intro}>
          <Text style={styles.title}>Ubicación del bus</Text>
          <Text style={styles.subtitle}>
            Posición aproximada durante el viaje activo. No es tracking permanente.
          </Text>
        </View>

        {locations.length > 1 ? (
          <View style={styles.selectorRow}>
            {locations.map((location) => {
              const selected = location.tripId === effectiveSelectedTripId;

              return (
                <Pressable
                  key={location.tripId}
                  onPress={() => setSelectedTripId(location.tripId)}
                  style={[styles.chip, selected ? styles.chipSelected : null]}
                >
                  <Text style={[styles.chipText, selected ? styles.chipTextSelected : null]}>
                    {location.studentNames.join(", ")}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.mapWrap}>
          <ParentBusMap locations={locations} selectedTripId={effectiveSelectedTripId} />
        </View>
      </View>
    </SafeAreaView>
  );
}
