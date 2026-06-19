import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { mapActivityEventLabel } from "@/src/features/trips/domain/activity-event.labels";
import type { OperatorActivityRow } from "@/src/features/trips/types/activity.types";

type ActivityEventRowProps = {
  event: OperatorActivityRow;
};

function formatEventTime(iso: string | null): string {
  if (!iso) {
    return "—";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityEventRow({ event }: ActivityEventRowProps) {
  const { colors, tokens } = useAppTheme();
  const isVoided = Boolean(event.voidedAt);
  const isOfflineSync = event.isOfflineSync;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: tokens.spacing.md,
          backgroundColor: colors.surfaceListItem,
          borderRadius: tokens.radius.lg,
          padding: tokens.spacing.md,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          opacity: isVoided ? 0.72 : 1,
        },
        timeColumn: {
          minWidth: 48,
          paddingTop: 2,
        },
        time: {
          ...tokens.typography.bodyStrong,
          color: colors.textTitle,
        },
        content: {
          flex: 1,
          gap: tokens.spacing.xs,
        },
        studentName: {
          ...tokens.typography.bodyStrong,
          color: colors.textTitle,
        },
        eventLabel: {
          ...tokens.typography.body,
          color: colors.textBody,
        },
        badgeRow: {
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          gap: tokens.spacing.xs,
          marginTop: tokens.spacing.xs,
        },
        voidBadge: {
          ...tokens.typography.caption,
          color: colors.attendancePending,
          backgroundColor: "rgba(197, 48, 48, 0.1)",
          borderRadius: tokens.radius.sm,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: 2,
          overflow: "hidden",
        },
        offlineBadge: {
          ...tokens.typography.caption,
          color: colors.feedbackWarningTitle,
          backgroundColor: colors.feedbackWarningBg,
          borderRadius: tokens.radius.sm,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: 2,
          overflow: "hidden",
        },
      }),
    [colors, isVoided, tokens],
  );

  return (
    <View style={styles.row}>
      <View style={styles.timeColumn}>
        <Text style={styles.time}>{formatEventTime(event.scannedAt)}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.studentName}>{event.studentName}</Text>
        <Text style={styles.eventLabel}>
          {mapActivityEventLabel(event.eventType, event.tripDirection, event.turnType)}
        </Text>
        {isVoided || isOfflineSync ? (
          <View style={styles.badgeRow}>
            {isOfflineSync ? (
              <>
                <MaterialCommunityIcons
                  name="cloud-sync-outline"
                  size={14}
                  color={colors.feedbackWarningTitle}
                />
                <Text style={styles.offlineBadge}>Offline</Text>
              </>
            ) : null}
            {isVoided ? (
              <>
                <MaterialCommunityIcons name="cancel" size={14} color={colors.attendancePending} />
                <Text style={styles.voidBadge}>Anulado</Text>
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
