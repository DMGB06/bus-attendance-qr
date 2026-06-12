import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import type { ParentStatusTone } from "@/src/features/parent/types";

type ChildStatusBadgeProps = {
  label: string;
  tone: ParentStatusTone;
};

export function ChildStatusBadge({ label, tone }: ChildStatusBadgeProps) {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        badge: {
          borderRadius: tokens.radius.full,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: tokens.spacing.xs,
          alignSelf: "flex-start",
        },
        badgePending: {
          backgroundColor: colors.attendancePending,
        },
        badgeOnboard: {
          backgroundColor: colors.attendanceOnboard,
        },
        badgeCompleted: {
          backgroundColor: colors.attendanceCompleted,
        },
        badgeAbsent: {
          backgroundColor: colors.feedbackWarningBg,
        },
        badgeNeutral: {
          backgroundColor: colors.primarySoftBg,
        },
        badgeText: {
          ...tokens.typography.overline,
          color: colors.attendanceLabel,
        },
        badgeTextAbsent: {
          color: colors.feedbackError,
        },
        badgeTextNeutral: {
          color: colors.primarySoftText,
        },
      }),
    [colors, tokens],
  );

  const variantStyle =
    tone === "completed"
      ? styles.badgeCompleted
      : tone === "onboard"
        ? styles.badgeOnboard
        : tone === "absent"
          ? styles.badgeAbsent
          : tone === "neutral"
            ? styles.badgeNeutral
            : styles.badgePending;

  const textStyle =
    tone === "absent"
      ? styles.badgeTextAbsent
      : tone === "neutral"
        ? styles.badgeTextNeutral
        : styles.badgeText;

  return (
    <View style={[styles.badge, variantStyle]}>
      <Text style={textStyle}>{label.toUpperCase()}</Text>
    </View>
  );
}

type ChildStatusIconProps = {
  icon: string;
  tone: ParentStatusTone;
};

export function ChildStatusIcon({ icon, tone }: ChildStatusIconProps) {
  const { colors } = useAppTheme();

  const iconColor =
    tone === "completed"
      ? colors.attendanceCompleted
      : tone === "onboard"
        ? colors.attendanceOnboard
        : tone === "absent"
          ? colors.feedbackError
          : tone === "neutral"
            ? colors.primary
            : colors.attendancePending;

  return (
    <MaterialCommunityIcons
      name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
      size={28}
      color={iconColor}
    />
  );
}
