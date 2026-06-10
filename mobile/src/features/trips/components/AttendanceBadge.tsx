import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import type { TripDirection } from "@/src/features/trips/types";
import { getDropoffLabel } from "@/src/features/trips/domain/trip-labels";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";

export type AttendanceBadgeStatus = "pending" | "onboard" | "completed";

interface AttendanceBadgeProps {
  status: AttendanceBadgeStatus;
  direction: TripDirection;
  label?: string;
}

export function AttendanceBadge({ status, direction, label }: AttendanceBadgeProps) {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        badge: {
          minWidth: 88,
          borderRadius: tokens.radius.full,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: tokens.spacing.xs,
          alignItems: "center",
        },
        badgeOnboard: {
          backgroundColor: colors.attendanceOnboard,
        },
        badgeCompleted: {
          backgroundColor: colors.attendanceCompleted,
        },
        badgePending: {
          backgroundColor: colors.attendancePending,
        },
        badgeText: {
          ...tokens.typography.overline,
          color: colors.attendanceLabel,
        },
      }),
    [colors, tokens],
  );

  const variantStyle =
    status === "completed"
      ? styles.badgeCompleted
      : status === "onboard"
        ? styles.badgeOnboard
        : styles.badgePending;

  const defaultLabel =
    status === "completed"
      ? getDropoffLabel(direction).toUpperCase()
      : status === "onboard"
        ? "A BORDO"
        : "PENDIENTE";

  return (
    <View style={[styles.badge, variantStyle]}>
      <Text style={styles.badgeText}>{label ?? defaultLabel}</Text>
    </View>
  );
}
