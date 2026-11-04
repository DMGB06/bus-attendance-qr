import { memo, useCallback, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { formatLastUpdatedAt, mapChildStatusToPresentation } from "@/src/features/parent/domain/student-status.mapper";
import { ChildTimelinePreview } from "@/src/features/parent/components/ChildTimelinePreview";
import type { ParentChildSummary, ParentStatusTone } from "@/src/features/parent/types";
import { formatTurnTypeLabel } from "@/src/features/trips/domain/trip-labels";

type ChildStatusCardProps = {
  item: ParentChildSummary;
  studentId: string;
  onOpenChild: (studentId: string) => void;
};

function statusStripTheme(
  tone: ParentStatusTone,
  colors: ReturnType<typeof useAppTheme>["colors"],
) {
  switch (tone) {
    case "completed":
      return { backgroundColor: colors.statusCompletedBg, labelColor: colors.statusCompletedText };
    case "onboard":
      return { backgroundColor: colors.statusOnboardBg, labelColor: colors.statusOnboardText };
    case "absent":
      return { backgroundColor: colors.statusPendingBg, labelColor: colors.statusPendingText };
    default:
      return { backgroundColor: colors.surfaceTrack, labelColor: colors.textTitle };
  }
}

export const ChildStatusCard = memo(function ChildStatusCard({
  item,
  studentId,
  onOpenChild,
}: ChildStatusCardProps) {
  const handlePress = useCallback(() => {
    onOpenChild(studentId);
  }, [onOpenChild, studentId]);
  const { colors, tokens } = useAppTheme();
  const latestTimelineEvent = item.todayTimeline.at(-1) ?? null;
  const presentation = mapChildStatusToPresentation({
    latestEvent: latestTimelineEvent,
    status: item.todayStatus?.status ?? null,
    direction: item.todayStatus?.direction ?? item.activeTrip?.direction ?? null,
    hasActiveTrip: item.activeTrip?.status === "active",
  });
  const lastUpdated = formatLastUpdatedAt(
    latestTimelineEvent?.scanned_at ?? item.todayStatus?.last_event_at,
  );
  const stripTheme = statusStripTheme(presentation.tone, colors);

  const segmentLabel = latestTimelineEvent?.turn_type
    ? formatTurnTypeLabel(latestTimelineEvent.turn_type)
    : item.activeTrip?.turn_type
      ? formatTurnTypeLabel(item.activeTrip.turn_type)
      : item.todayStatus?.direction === "retorno"
        ? "Retorno"
        : item.todayStatus?.direction === "recojo"
          ? "Recojo"
          : null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surfaceCard,
          borderRadius: tokens.radius.lg,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          overflow: "hidden",
        },
        identitySection: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.md,
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.lg,
          paddingBottom: tokens.spacing.md,
        },
        identityBody: {
          flex: 1,
          minWidth: 0,
          gap: 4,
        },
        name: {
          ...tokens.typography.title3,
          color: colors.textTitle,
        },
        school: {
          ...tokens.typography.caption,
          color: colors.textBody,
          lineHeight: 18,
        },
        chevron: {
          marginLeft: tokens.spacing.xs,
        },
        statusStrip: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: tokens.spacing.md,
          paddingVertical: tokens.spacing.md,
          paddingHorizontal: tokens.spacing.lg,
          borderTopWidth: 1,
          borderTopColor: colors.surfaceDivider,
        },
        statusTextCol: {
          flex: 1,
          minWidth: 0,
          gap: 4,
          paddingTop: 2,
        },
        statusLabel: {
          ...tokens.typography.title2,
        },
        statusSubtitle: {
          ...tokens.typography.body,
          color: colors.textBody,
        },
        metaRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: tokens.spacing.xs,
          marginTop: tokens.spacing.xs,
        },
        metaItem: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          flexShrink: 1,
        },
        metaText: {
          ...tokens.typography.caption,
          color: colors.textMuted,
          flexShrink: 1,
        },
        metaDot: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        timelineSection: {
          paddingHorizontal: tokens.spacing.lg,
          paddingBottom: tokens.spacing.md,
          gap: tokens.spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.surfaceDivider,
          paddingTop: tokens.spacing.md,
        },
      }),
    [colors, tokens],
  );

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed ? { opacity: 0.94 } : null]}
      accessibilityRole="button"
      accessibilityLabel={`${item.student.nombre_alumno}: ${presentation.label}. Ver detalle`}
    >
      <View style={styles.identitySection}>
        <View style={styles.identityBody}>
          <Text style={styles.name} numberOfLines={2}>
            {item.student.nombre_alumno}
          </Text>

          {item.student.colegio ? (
            <Text style={styles.school} numberOfLines={2}>
              {item.student.colegio}
            </Text>
          ) : null}

        </View>

        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={colors.textMuted}
          style={styles.chevron}
        />
      </View>

      <View
        style={[
          styles.statusStrip,
          { backgroundColor: stripTheme.backgroundColor },
        ]}
      >
        <View style={styles.statusTextCol}>
          <Text style={[styles.statusLabel, { color: stripTheme.labelColor }]}>
            {presentation.label}
          </Text>
          <Text style={styles.statusSubtitle}>{presentation.subtitle}</Text>

          {segmentLabel || lastUpdated ? (
            <View style={styles.metaRow}>
              {segmentLabel ? (
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="routes" size={14} color={colors.textMuted} />
                  <Text style={styles.metaText}>{segmentLabel}</Text>
                </View>
              ) : null}
              {segmentLabel && lastUpdated ? <Text style={styles.metaDot}>·</Text> : null}
              {lastUpdated ? (
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.metaText}>Actualizado {lastUpdated}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      {item.todayTimeline.length > 0 ? (
        <View style={styles.timelineSection}>
          <ChildTimelinePreview events={item.todayTimeline} />
        </View>
      ) : null}
    </Pressable>
  );
});
