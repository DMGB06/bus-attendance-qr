import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Avatar, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import {
  mapActivityEventLabelShort,
  mapActivityEventTagLabel,
} from "@/src/features/trips/domain/activity-event.labels";
import {
  formatActivityEventTime,
  getActivityEventColors,
  getStudentInitials,
} from "@/src/features/trips/domain/activity-row.utils";
import type { OperatorActivityRow } from "@/src/features/trips/types/activity.types";

export const ACTIVITY_ROW_HEIGHT = 60;

type ActivityEventRowProps = {
  event: OperatorActivityRow;
};

export function ActivityEventRow({ event }: ActivityEventRowProps) {
  const { colors, tokens } = useAppTheme();
  const isVoided = Boolean(event.voidedAt);
  const isOfflineSync = event.isOfflineSync;
  const eventColors = getActivityEventColors(event.eventType, colors);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surfaceListItem,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderMuted,
          borderLeftWidth: 4,
          borderLeftColor: eventColors.stripe,
          paddingLeft: tokens.spacing.md,
          paddingRight: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
          gap: tokens.spacing.md,
          minHeight: ACTIVITY_ROW_HEIGHT,
          opacity: isVoided ? 0.72 : 1,
        },
        avatar: {
          backgroundColor: colors.primary,
        },
        body: {
          flex: 1,
          gap: 2,
          minWidth: 0,
        },
        name: {
          ...tokens.typography.bodyStrong,
          color: colors.textTitle,
        },
        action: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        trailing: {
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 4,
          minWidth: 72,
        },
        time: {
          ...tokens.typography.bodyStrong,
          color: colors.textTitle,
        },
        statusTag: {
          backgroundColor: eventColors.tagBg,
          borderRadius: tokens.radius.xs,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: 4,
          minWidth: 68,
          alignItems: "center",
        },
        statusTagText: {
          ...tokens.typography.overline,
          color: eventColors.tagText,
          letterSpacing: 0.2,
          textAlign: "center",
        },
        badgeRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        },
        badgeText: {
          ...tokens.typography.caption,
          fontSize: 10,
          color: colors.textMuted,
        },
      }),
    [colors, eventColors, isVoided, tokens],
  );

  const initials = getStudentInitials(event.studentName);
  const actionLabel = mapActivityEventLabelShort(event.eventType, event.tripDirection);
  const tagLabel = isVoided ? "Anulado" : mapActivityEventTagLabel(event.eventType, event.tripDirection);

  return (
    <View style={styles.row}>
      <Avatar.Text size={32} label={initials || "AL"} style={styles.avatar} />

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {event.studentName}
        </Text>
        <Text style={styles.action} numberOfLines={1}>
          {actionLabel}
        </Text>
        {isOfflineSync ? (
          <View style={styles.badgeRow}>
            <MaterialCommunityIcons
              name="cloud-sync-outline"
              size={12}
              color={colors.feedbackWarningTitle}
            />
            <Text style={styles.badgeText}>Sync offline</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.trailing}>
        <Text style={styles.time}>{formatActivityEventTime(event.scannedAt)}</Text>
        <View style={styles.statusTag}>
          <Text style={styles.statusTagText}>{tagLabel}</Text>
        </View>
      </View>
    </View>
  );
}
