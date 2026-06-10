import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Surface, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { Trip, TripStatus } from "@/src/features/trips/types";
import {
  formatTripTitle,
  getTripSegmentSubtitle,
} from "@/src/features/trips/domain/trip-labels";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";

interface TripHeaderProps {
  trip: Trip;
}

export { formatTripDirectionLabel, formatTripTitle } from "@/src/features/trips/domain/trip-labels";

export function formatTripStatusLabel(status: TripStatus): string {
  if (status === "active") {
    return "Activo";
  }

  if (status === "completed") {
    return "Completado";
  }

  return status;
}

export function TripHeader({ trip }: TripHeaderProps) {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surfaceCard,
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.lg,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          borderTopWidth: 4,
          borderTopColor: colors.accent,
        },
        topRow: {
          flexDirection: "row",
          alignItems: "center",
        },
        iconContainer: {
          width: tokens.layout.iconSm,
          height: tokens.layout.iconSm,
          borderRadius: tokens.radius.sm,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.primary,
        },
        titleContainer: {
          flex: 1,
          marginLeft: tokens.spacing.md,
        },
        title: {
          ...tokens.typography.title3,
          color: colors.textTitle,
        },
        subtitle: {
          ...tokens.typography.caption,
          color: colors.textMuted,
          marginTop: tokens.spacing.xs,
        },
        statusBadge: {
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.xs,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.statusBadgeBg,
        },
        statusBadgeActive: {
          backgroundColor: colors.statusBadgeActiveBg,
        },
        statusText: {
          ...tokens.typography.caption,
          color: colors.statusBadgeText,
          fontWeight: "700",
        },
        statusTextActive: {
          color: colors.statusSuccessText,
        },
        divider: {
          height: 1,
          backgroundColor: colors.surfaceDivider,
          marginVertical: tokens.radius.lg,
        },
        infoContainer: {
          gap: tokens.spacing.md,
        },
        infoRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
        },
        infoText: {
          ...tokens.typography.body,
          color: colors.textBody,
          fontSize: tokens.fontSize.md,
        },
      }),
    [colors, tokens],
  );

  const startedAtLabel = trip.started_at
    ? new Date(trip.started_at).toLocaleString()
    : "Sin hora de inicio";

  const isActive = trip.status === "active";

  return (
    <Surface style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name={trip.direction === "recojo" ? "arrow-up" : "arrow-down"}
            size={tokens.fontSize.xl}
            color={colors.primaryIconContrast}
          />
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>{formatTripTitle(trip)}</Text>
          <Text style={styles.subtitle}>{getTripSegmentSubtitle(trip)}</Text>
        </View>

        <View style={[styles.statusBadge, isActive && styles.statusBadgeActive]}>
          <Text style={[styles.statusText, isActive && styles.statusTextActive]}>
            {formatTripStatusLabel(trip.status)}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="calendar-month-outline"
            size={tokens.fontSize.lg}
            color={colors.primarySoftText}
          />
          <Text style={styles.infoText}>{trip.trip_date}</Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={tokens.fontSize.lg}
            color={colors.primarySoftText}
          />
          <Text style={styles.infoText}>{startedAtLabel}</Text>
        </View>
      </View>
    </Surface>
  );
}
