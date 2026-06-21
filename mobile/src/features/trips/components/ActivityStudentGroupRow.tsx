import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Avatar, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { ActivityEventDetailRow } from "@/src/features/trips/components/ActivityEventDetailRow";
import {
  mapActivityEventTagLabel,
} from "@/src/features/trips/domain/activity-event.labels";
import { buildStudentActivitySummary } from "@/src/features/trips/domain/activity-student-grouping";
import {
  formatActivityEventTime,
  getActivityEventColors,
  getStudentInitials,
} from "@/src/features/trips/domain/activity-row.utils";
import type { ActivityStudentGroup } from "@/src/features/trips/types/activity.types";

export const ACTIVITY_STUDENT_ROW_HEIGHT = 60;

type ActivityStudentGroupRowProps = {
  group: ActivityStudentGroup;
  expanded: boolean;
  onToggle: () => void;
};

export function ActivityStudentGroupRow({
  group,
  expanded,
  onToggle,
}: ActivityStudentGroupRowProps) {
  const { colors, tokens } = useAppTheme();
  const latestEvent = group.events[0];
  const isExpandable = group.events.length > 1;
  const summary = buildStudentActivitySummary(group);
  const isVoided = Boolean(latestEvent?.voidedAt);
  const eventColors = getActivityEventColors(latestEvent?.eventType ?? "subio", colors);
  const initials = getStudentInitials(group.studentName);
  const tagLabel = isVoided
    ? "Anulado"
    : mapActivityEventTagLabel(
        latestEvent?.eventType ?? "subio",
        latestEvent?.tripDirection ?? "recojo",
      );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          borderBottomWidth: 1,
          borderBottomColor: colors.borderMuted,
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surfaceListItem,
          borderLeftWidth: 4,
          borderLeftColor: eventColors.stripe,
          paddingLeft: tokens.spacing.md,
          paddingRight: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
          gap: tokens.spacing.md,
          minHeight: ACTIVITY_STUDENT_ROW_HEIGHT,
          opacity: isVoided && !isExpandable ? 0.72 : 1,
        },
        rowPressable: {
          opacity: 1,
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
        summary: {
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
        movementCount: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        chevron: {
          marginTop: 2,
        },
      }),
    [colors, eventColors, isExpandable, isVoided, tokens],
  );

  if (!latestEvent) {
    return null;
  }

  const rowContent = (
    <>
      <Avatar.Text size={32} label={initials || "AL"} style={styles.avatar} />

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {group.studentName}
        </Text>
        <Text style={styles.summary} numberOfLines={isExpandable && !expanded ? 2 : 1}>
          {summary}
        </Text>
      </View>

      <View style={styles.trailing}>
        {!isExpandable ? (
          <>
            <Text style={styles.time}>{formatActivityEventTime(latestEvent.scannedAt)}</Text>
            <View style={styles.statusTag}>
              <Text style={styles.statusTagText}>{tagLabel}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.movementCount}>
              {group.events.length} movimientos
            </Text>
            <MaterialCommunityIcons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.textMuted}
              style={styles.chevron}
            />
          </>
        )}
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      {isExpandable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${group.studentName}, ${group.events.length} movimientos`}
          onPress={onToggle}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressable, { opacity: pressed ? 0.92 : 1 }]}
        >
          {rowContent}
        </Pressable>
      ) : (
        <View style={styles.row}>{rowContent}</View>
      )}

      {isExpandable && expanded
        ? group.events.map((event) => (
            <ActivityEventDetailRow key={event.recordId} event={event} />
          ))
        : null}
    </View>
  );
}
