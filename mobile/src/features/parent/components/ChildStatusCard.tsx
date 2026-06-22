import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import {
  formatLastUpdatedAt,
  mapLatestTimelineEventToPresentation,
  mapStudentTripStatusToPresentation,
} from "@/src/features/parent/domain/student-status.mapper";
import { ChildStatusIcon } from "@/src/features/parent/components/ChildStatusBadge";
import { ChildTimelinePreview } from "@/src/features/parent/components/ChildTimelinePreview";
import type { ParentChildSummary, ParentStatusTone } from "@/src/features/parent/types";
import type { NivelEducativo } from "@/src/features/trips/types";
import { formatTurnTypeLabel } from "@/src/features/trips/domain/trip-labels";

type ChildStatusCardProps = {
  item: ParentChildSummary;
  onPress: () => void;
};

function formatNivelLabel(nivel: NivelEducativo | null | undefined): string | null {
  if (nivel === "primaria") {
    return "Primaria";
  }
  if (nivel === "secundaria") {
    return "Secundaria";
  }
  return null;
}

function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function statusStripTheme(
  tone: ParentStatusTone,
  colors: ReturnType<typeof useAppTheme>["colors"],
) {
  switch (tone) {
    case "completed":
      return {
        backgroundColor: "rgba(22, 101, 52, 0.07)",
        accentColor: colors.attendanceCompleted,
        labelColor: colors.textTitle,
      };
    case "onboard":
      return {
        backgroundColor: colors.primarySoftBg,
        accentColor: colors.primary,
        labelColor: colors.textTitle,
      };
    case "absent":
      return {
        backgroundColor: colors.feedbackWarningBg,
        accentColor: colors.feedbackError,
        labelColor: colors.textTitle,
      };
    case "pending":
      return {
        backgroundColor: "rgba(28, 50, 132, 0.06)",
        accentColor: colors.primary,
        labelColor: colors.primarySoftText,
      };
    default:
      return {
        backgroundColor: colors.surfaceTrack,
        accentColor: colors.textMuted,
        labelColor: colors.textTitle,
      };
  }
}

export function ChildStatusCard({ item, onPress }: ChildStatusCardProps) {
  const { colors, tokens } = useAppTheme();
  const latestTimelineEvent = item.todayTimeline.at(-1) ?? null;
  const presentation = latestTimelineEvent
    ? mapLatestTimelineEventToPresentation(latestTimelineEvent)
    : mapStudentTripStatusToPresentation(
        item.todayStatus?.status ?? null,
        item.todayStatus?.direction ?? item.activeTrip?.direction ?? null,
      );
  const lastUpdated = formatLastUpdatedAt(
    latestTimelineEvent?.scanned_at ?? item.todayStatus?.last_event_at,
  );
  const nivelLabel = formatNivelLabel(item.student.nivel_educativo);
  const stripTheme = statusStripTheme(presentation.tone, colors);
  const initials = studentInitials(item.student.nombre_alumno);

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
          borderRadius: tokens.radius.xl,
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
        avatar: {
          width: 52,
          height: 52,
          borderRadius: tokens.radius.lg,
          backgroundColor: colors.primarySoftBg,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "rgba(28, 50, 132, 0.1)",
        },
        avatarText: {
          ...tokens.typography.headline,
          color: colors.primarySoftText,
          letterSpacing: 0.5,
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
        chipRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: tokens.spacing.xs,
          marginTop: 2,
        },
        metaChip: {
          borderRadius: tokens.radius.full,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: 3,
          backgroundColor: colors.surfaceTrack,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
        },
        metaChipText: {
          ...tokens.typography.caption,
          color: colors.textMuted,
          fontWeight: "500",
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
        statusAccent: {
          width: 4,
          alignSelf: "stretch",
          borderRadius: tokens.radius.full,
          marginVertical: 2,
        },
        statusIconWrap: {
          width: 40,
          height: 40,
          borderRadius: tokens.radius.full,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surfaceCard,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
        },
        statusTextCol: {
          flex: 1,
          minWidth: 0,
          gap: 4,
          paddingTop: 2,
        },
        statusLabel: {
          ...tokens.typography.headline,
        },
        statusSubtitle: {
          ...tokens.typography.body,
          color: colors.textBody,
          lineHeight: 20,
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
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? { opacity: 0.94 } : null]}
      accessibilityRole="button"
      accessibilityLabel={`Ver estado de ${item.student.nombre_alumno}`}
    >
      <View style={styles.identitySection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.identityBody}>
          <Text style={styles.name} numberOfLines={2}>
            {item.student.nombre_alumno}
          </Text>

          {item.student.colegio ? (
            <Text style={styles.school} numberOfLines={2}>
              {item.student.colegio}
            </Text>
          ) : null}

          {nivelLabel ? (
            <View style={styles.chipRow}>
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>{nivelLabel}</Text>
              </View>
            </View>
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
        <View style={[styles.statusAccent, { backgroundColor: stripTheme.accentColor }]} />

        <View style={styles.statusIconWrap}>
          <ChildStatusIcon icon={presentation.icon} tone={presentation.tone} />
        </View>

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
}
