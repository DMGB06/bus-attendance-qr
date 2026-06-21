import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import {
  formatActivityEventTime,
  getActivityEventColors,
} from "@/src/features/trips/domain/activity-row.utils";
import {
  mapActivityEventLabelShort,
  mapActivityEventTagLabel,
} from "@/src/features/trips/domain/activity-event.labels";
import type { OperatorActivityRow } from "@/src/features/trips/types/activity.types";

type ActivityEventDetailRowProps = {
  event: OperatorActivityRow;
};

export function ActivityEventDetailRow({ event }: ActivityEventDetailRowProps) {
  const { colors, tokens } = useAppTheme();
  const isVoided = Boolean(event.voidedAt);
  const eventColors = getActivityEventColors(event.eventType, colors);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
          paddingLeft: tokens.spacing.xl + 32 + tokens.spacing.md,
          paddingRight: tokens.spacing.md,
          paddingVertical: tokens.spacing.xs,
          backgroundColor: colors.surfaceTrack,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderMuted,
          opacity: isVoided ? 0.72 : 1,
        },
        time: {
          ...tokens.typography.caption,
          color: colors.textTitle,
          minWidth: 44,
        },
        label: {
          ...tokens.typography.caption,
          color: colors.textMuted,
          flex: 1,
        },
        statusTag: {
          backgroundColor: eventColors.tagBg,
          borderRadius: tokens.radius.xs,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: 3,
          minWidth: 60,
          alignItems: "center",
        },
        statusTagText: {
          ...tokens.typography.overline,
          color: eventColors.tagText,
          letterSpacing: 0.2,
          textAlign: "center",
        },
      }),
    [colors, eventColors, isVoided, tokens],
  );

  const actionLabel = mapActivityEventLabelShort(event.eventType, event.tripDirection);
  const tagLabel = isVoided ? "Anulado" : mapActivityEventTagLabel(event.eventType, event.tripDirection);

  return (
    <View style={styles.row}>
      <Text style={styles.time}>{formatActivityEventTime(event.scannedAt)}</Text>
      <Text style={styles.label} numberOfLines={1}>
        {actionLabel}
      </Text>
      <View style={styles.statusTag}>
        <Text style={styles.statusTagText}>{tagLabel}</Text>
      </View>
    </View>
  );
}
