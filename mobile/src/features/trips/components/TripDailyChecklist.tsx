import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  buildDailyChecklist,
  getDailyChecklistTitle,
  type DailyChecklistContext,
  type ChecklistStepStatus,
} from "@/src/features/trips/domain/trip-daily-checklist";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";

type TripDailyChecklistProps = {
  context: DailyChecklistContext;
  compact?: boolean;
};

function stepIcon(status: ChecklistStepStatus): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (status) {
    case "done":
      return "check-circle";
    case "current":
      return "arrow-right-circle";
    default:
      return "checkbox-blank-circle-outline";
  }
}

export const TripDailyChecklist = memo(function TripDailyChecklist({
  context,
  compact = false,
}: TripDailyChecklistProps) {
  const { colors, tokens } = useAppTheme();
  const steps = useMemo(() => buildDailyChecklist(context), [context]);
  const title = getDailyChecklistTitle(context);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          gap: compact ? tokens.spacing.xs : tokens.spacing.sm,
          padding: compact ? tokens.spacing.sm : tokens.spacing.md,
          borderRadius: tokens.radius.md,
          backgroundColor: colors.surfaceTrack,
          borderWidth: 1,
          borderColor: colors.borderMuted,
        },
        title: {
          ...tokens.typography.label,
          color: colors.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.6,
        },
        stepRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: tokens.spacing.sm,
          paddingVertical: compact ? 2 : tokens.spacing.xs,
        },
        stepBody: {
          flex: 1,
          gap: 2,
        },
        stepLabel: {
          ...tokens.typography.body,
          color: colors.textBody,
        },
        stepLabelCurrent: {
          ...tokens.typography.bodyStrong,
          color: colors.textTitle,
        },
        stepHint: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
      }),
    [colors, compact, tokens],
  );

  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.title}>{title}</Text>
      {steps.map((step) => {
        const icon = stepIcon(step.status);
        const iconColor =
          step.status === "done"
            ? colors.attendanceCompleted
            : step.status === "current"
              ? colors.primary
              : colors.textMuted;

        return (
          <View key={step.id} style={styles.stepRow}>
            <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
            <View style={styles.stepBody}>
              <Text style={step.status === "current" ? styles.stepLabelCurrent : styles.stepLabel}>
                {step.label}
              </Text>
              {step.hint && step.status !== "done" ? (
                <Text style={styles.stepHint}>{step.hint}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
});
