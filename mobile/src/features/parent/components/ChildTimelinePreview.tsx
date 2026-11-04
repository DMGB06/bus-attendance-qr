import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { mapTimelineEventLabel } from "@/src/features/parent/domain/student-status.mapper";
import type { ChildTimelineEvent } from "@/src/features/parent/types";
import { formatEventTime } from "@/src/features/parent/domain/format-event-time";

type ChildTimelinePreviewProps = {
  events: ChildTimelineEvent[];
  compact?: boolean;
};

export function ChildTimelinePreview({ events, compact = false }: ChildTimelinePreviewProps) {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          gap: compact ? tokens.spacing.xs : tokens.spacing.sm,
        },
        heading: {
          ...tokens.typography.caption,
          color: colors.textMuted,
          fontWeight: "600",
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
        },
        dot: {
          width: 6,
          height: 6,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.primary,
        },
        label: {
          flex: 1,
          ...tokens.typography.caption,
          color: colors.textBody,
        },
        time: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        empty: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
      }),
    [colors, tokens, compact],
  );

  if (!events.length) {
    return compact ? null : (
      <Text style={styles.empty}>Sin eventos registrados hoy todavía.</Text>
    );
  }

  return (
    <View style={styles.container}>
      {!compact ? <Text style={styles.heading}>Historial de hoy</Text> : null}
      {events.map((event) => (
        <View key={event.id} style={styles.row}>
          <View style={styles.dot} />
          <Text style={styles.label} numberOfLines={2}>
            {mapTimelineEventLabel(event.event_type, event.trip_direction, event.turn_type)}
          </Text>
          <Text style={styles.time}>{formatEventTime(event.scanned_at)}</Text>
        </View>
      ))}
    </View>
  );
}

