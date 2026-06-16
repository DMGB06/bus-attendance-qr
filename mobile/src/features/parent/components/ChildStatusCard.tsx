import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import {
  formatLastUpdatedAt,
  mapStudentTripStatusToPresentation,
} from "@/src/features/parent/domain/student-status.mapper";
import { ChildStatusBadge, ChildStatusIcon } from "@/src/features/parent/components/ChildStatusBadge";
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

function statusPanelColors(
  tone: ParentStatusTone,
  colors: ReturnType<typeof useAppTheme>["colors"],
) {
  switch (tone) {
    case "completed":
      return {
        backgroundColor: "rgba(22, 101, 52, 0.08)",
        borderColor: "rgba(22, 101, 52, 0.2)",
      };
    case "onboard":
      return {
        backgroundColor: colors.primarySoftBg,
        borderColor: "rgba(28, 50, 132, 0.16)",
      };
    case "absent":
      return {
        backgroundColor: colors.feedbackWarningBg,
        borderColor: "rgba(197, 48, 48, 0.18)",
      };
    case "pending":
      return {
        backgroundColor: colors.surfaceTrack,
        borderColor: colors.surfaceCardBorder,
      };
    default:
      return {
        backgroundColor: colors.surfaceTrack,
        borderColor: colors.surfaceCardBorder,
      };
  }
}

export function ChildStatusCard({ item, onPress }: ChildStatusCardProps) {
  const { colors, tokens } = useAppTheme();
  const presentation = mapStudentTripStatusToPresentation(
    item.todayStatus?.status ?? null,
    item.todayStatus?.direction ?? item.activeTrip?.direction ?? null,
  );
  const lastUpdated = formatLastUpdatedAt(item.todayStatus?.last_event_at);
  const nivelLabel = formatNivelLabel(item.student.nivel_educativo);
  const panelColors = statusPanelColors(presentation.tone, colors);

  const segmentLabel = item.activeTrip?.turn_type
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
        topSection: {
          padding: tokens.spacing.lg,
          gap: tokens.spacing.md,
        },
        headerRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: tokens.spacing.md,
        },
        avatar: {
          width: 48,
          height: 48,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.primarySoftBg,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
        },
        headerBody: {
          flex: 1,
          minWidth: 0,
          gap: tokens.spacing.xs,
        },
        nameRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: tokens.spacing.sm,
        },
        name: {
          flex: 1,
          ...tokens.typography.title3,
          color: colors.textTitle,
        },
        chevron: {
          marginTop: 2,
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
          paddingVertical: 2,
          backgroundColor: colors.surfaceTrack,
        },
        metaChipText: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        statusPanel: {
          marginHorizontal: tokens.spacing.lg,
          marginBottom: tokens.spacing.lg,
          borderRadius: tokens.radius.lg,
          borderWidth: 1,
          padding: tokens.spacing.md,
          gap: tokens.spacing.sm,
        },
        statusSubtitle: {
          ...tokens.typography.body,
          color: colors.textTitle,
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
      <View style={styles.topSection}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <ChildStatusIcon icon={presentation.icon} tone={presentation.tone} />
          </View>

          <View style={styles.headerBody}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{item.student.nombre_alumno}</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={colors.textMuted}
                style={styles.chevron}
              />
            </View>

            {item.student.colegio ? (
              <Text style={styles.school}>{item.student.colegio}</Text>
            ) : null}

            {nivelLabel ? (
              <View style={styles.chipRow}>
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{nivelLabel}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View
        style={[
          styles.statusPanel,
          {
            backgroundColor: panelColors.backgroundColor,
            borderColor: panelColors.borderColor,
          },
        ]}
      >
        <ChildStatusBadge label={presentation.label} tone={presentation.tone} />
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
    </Pressable>
  );
}
