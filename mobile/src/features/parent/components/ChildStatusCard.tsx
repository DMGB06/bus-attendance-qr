import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import {
  formatLastUpdatedAt,
  mapStudentTripStatusToPresentation,
} from "@/src/features/parent/domain/student-status.mapper";
import { ChildStatusBadge, ChildStatusIcon } from "@/src/features/parent/components/ChildStatusBadge";
import type { ParentChildSummary } from "@/src/features/parent/types";
import { formatTurnTypeLabel } from "@/src/features/trips/domain/trip-labels";

type ChildStatusCardProps = {
  item: ParentChildSummary;
  onPress: () => void;
};

export function ChildStatusCard({ item, onPress }: ChildStatusCardProps) {
  const { colors, tokens } = useAppTheme();
  const presentation = mapStudentTripStatusToPresentation(
    item.todayStatus?.status ?? null,
    item.todayStatus?.direction ?? item.activeTrip?.direction ?? null,
  );
  const lastUpdated = formatLastUpdatedAt(item.todayStatus?.last_event_at);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surfaceCard,
          borderRadius: tokens.radius.xl,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          padding: tokens.spacing.lg,
          gap: tokens.spacing.md,
        },
        headerRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.md,
        },
        avatar: {
          width: 52,
          height: 52,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.primarySoftBg,
          alignItems: "center",
          justifyContent: "center",
        },
        headerText: {
          flex: 1,
          gap: tokens.spacing.xs,
        },
        name: {
          ...tokens.typography.title3,
          color: colors.textTitle,
        },
        meta: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        statusBlock: {
          gap: tokens.spacing.xs,
        },
        statusTitle: {
          ...tokens.typography.bodyStrong,
          color: colors.textTitle,
        },
        statusSubtitle: {
          ...tokens.typography.caption,
          color: colors.textBody,
        },
        footer: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
      }),
    [colors, tokens],
  );

  const segmentLabel = item.activeTrip?.turn_type
    ? formatTurnTypeLabel(item.activeTrip.turn_type)
    : item.todayStatus?.direction === "retorno"
      ? "Retorno"
      : item.todayStatus?.direction === "recojo"
        ? "Recojo"
        : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? { opacity: 0.92 } : null]}
      accessibilityRole="button"
      accessibilityLabel={`Ver estado de ${item.student.nombre_alumno}`}
    >
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <ChildStatusIcon icon={presentation.icon} tone={presentation.tone} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={2}>
            {item.student.nombre_alumno}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[item.student.colegio, item.student.nivel_educativo].filter(Boolean).join(" · ") ||
              "Alumno del bus escolar"}
          </Text>
        </View>
      </View>

      <View style={styles.statusBlock}>
        <ChildStatusBadge label={presentation.label} tone={presentation.tone} />
        <Text style={styles.statusTitle}>{presentation.label}</Text>
        <Text style={styles.statusSubtitle}>{presentation.subtitle}</Text>
      </View>

      {segmentLabel ? <Text style={styles.footer}>Tramo hoy: {segmentLabel}</Text> : null}
      {lastUpdated ? <Text style={styles.footer}>Actualizado a las {lastUpdated}</Text> : null}
    </Pressable>
  );
}
