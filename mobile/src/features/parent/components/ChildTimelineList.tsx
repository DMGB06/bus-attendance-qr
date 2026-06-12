import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { mapTimelineEventLabel } from "@/src/features/parent/domain/student-status.mapper";
import type { ChildTimelineEvent } from "@/src/features/parent/types";

type ChildTimelineListProps = {
  events: ChildTimelineEvent[];
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

export function ChildTimelineList({ events }: ChildTimelineListProps) {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          gap: tokens.spacing.sm,
        },
        empty: {
          ...tokens.typography.body,
          color: colors.textMuted,
          textAlign: "center",
          paddingVertical: tokens.spacing.lg,
        },
        row: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: tokens.spacing.md,
          backgroundColor: colors.surfaceListItem,
          borderRadius: tokens.radius.lg,
          padding: tokens.spacing.md,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
        },
        iconWrap: {
          width: 36,
          height: 36,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.primarySoftBg,
          alignItems: "center",
          justifyContent: "center",
        },
        content: {
          flex: 1,
          gap: tokens.spacing.xs,
        },
        label: {
          ...tokens.typography.bodyStrong,
          color: colors.textTitle,
        },
        time: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
      }),
    [colors, tokens],
  );

  if (!events.length) {
    return (
      <Text style={styles.empty}>
        Aún no hay eventos registrados hoy. Cuando el bus escanee a tu hijo, aparecerán aquí.
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      {events.map((event) => (
        <View key={event.id} style={styles.row}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="history" size={18} color={colors.primary} />
          </View>
          <View style={styles.content}>
            <Text style={styles.label}>
              {mapTimelineEventLabel(event.event_type, event.trip_direction, event.turn_type)}
            </Text>
            <Text style={styles.time}>{formatEventTime(event.scanned_at)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
