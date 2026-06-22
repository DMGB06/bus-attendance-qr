import { useCallback, useMemo } from "react";
import { ActivityIndicator, RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import {
  formatLastUpdatedAt,
  mapLatestTimelineEventToPresentation,
  mapStudentTripStatusToPresentation,
} from "@/src/features/parent/domain/student-status.mapper";
import { ChildStatusBadge, ChildStatusIcon } from "@/src/features/parent/components/ChildStatusBadge";
import { ChildTimelineList } from "@/src/features/parent/components/ChildTimelineList";
import { useChildDetail } from "@/src/features/parent/hooks/useChildDetail";
import { StudentCard } from "@/src/features/trips/components/StudentCard";
import { formatTurnTypeLabel } from "@/src/features/trips/domain/trip-labels";
import type { NivelEducativo } from "@/src/features/trips/types";
import type { ParentStatusTone } from "@/src/features/parent/types";
import { AppParentStackHeader } from "@/src/shared/ui/AppParentStackHeader";
import { AppScrollView } from "@/src/shared/ui/AppScrollView";
import { useScrollBottomPadding } from "@/src/core/theme/useScrollBottomPadding";

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
    default:
      return {
        backgroundColor: colors.surfaceTrack,
        borderColor: colors.surfaceCardBorder,
      };
  }
}

export default function ChildDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const studentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { colors, tokens } = useAppTheme();
  const scrollBottom = useScrollBottomPadding(tokens.spacing.lg, true);
  const { child, timeline, loading, refreshing, error, refresh } = useChildDetail(studentId);

  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: colors.screenSolid,
        },
        loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        },
        content: {
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.lg,
          gap: tokens.spacing.lg,
        },
        heroCard: {
          backgroundColor: colors.surfaceCard,
          borderRadius: tokens.radius.xl,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          overflow: "hidden",
        },
        heroTop: {
          padding: tokens.spacing.lg,
          gap: tokens.spacing.md,
        },
        heroRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: tokens.spacing.md,
        },
        heroAvatar: {
          width: 48,
          height: 48,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.primarySoftBg,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
        },
        heroText: {
          flex: 1,
          minWidth: 0,
          gap: tokens.spacing.xs,
        },
        name: {
          ...tokens.typography.title2,
          color: colors.textTitle,
        },
        school: {
          ...tokens.typography.caption,
          color: colors.textBody,
          lineHeight: 18,
        },
        code: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        metaChip: {
          alignSelf: "flex-start",
          borderRadius: tokens.radius.full,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: 2,
          backgroundColor: colors.surfaceTrack,
          marginTop: tokens.spacing.xs,
        },
        metaChipText: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        statusPanel: {
          marginHorizontal: tokens.spacing.lg,
          marginTop: tokens.spacing.sm,
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
        },
        metaItem: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        },
        metaText: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        metaDot: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        sectionTitle: {
          ...tokens.typography.headline,
          color: colors.textTitle,
        },
        sectionHint: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        section: {
          gap: tokens.spacing.sm,
        },
        error: {
          ...tokens.typography.body,
          color: colors.feedbackError,
          textAlign: "center",
        },
      }),
    [colors, tokens],
  );

  if (loading) {
    return (
      <SafeAreaView edges={["bottom", "left", "right"]} style={styles.safeArea}>
        <AppParentStackHeader onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating size={36} color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!child) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppParentStackHeader onBack={() => router.back()} title="Detalle" />
        <View style={styles.content}>
          <Text style={styles.error}>{error ?? "No se encontró el alumno."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const latestTimelineEvent = timeline.at(-1) ?? null;
  const presentation = latestTimelineEvent
    ? mapLatestTimelineEventToPresentation(latestTimelineEvent)
    : mapStudentTripStatusToPresentation(
        child.todayStatus?.status ?? null,
        child.todayStatus?.direction ?? child.activeTrip?.direction ?? null,
      );
  const lastUpdated = formatLastUpdatedAt(
    latestTimelineEvent?.scanned_at ?? child.todayStatus?.last_event_at,
  );
  const nivelLabel = formatNivelLabel(child.student.nivel_educativo);
  const panelColors = statusPanelColors(presentation.tone, colors);
  const segmentLabel = latestTimelineEvent?.turn_type
    ? formatTurnTypeLabel(latestTimelineEvent.turn_type)
    : child.activeTrip?.turn_type
      ? formatTurnTypeLabel(child.activeTrip.turn_type)
      : null;

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={styles.safeArea}>
      <AppParentStackHeader onBack={() => router.back()} />

      <AppScrollView
        contentContainerStyle={[styles.content, { paddingBottom: scrollBottom }]}
        omitTabBarInset
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroRow}>
              <View style={styles.heroAvatar}>
                <ChildStatusIcon icon={presentation.icon} tone={presentation.tone} />
              </View>
              <View style={styles.heroText}>
                <Text style={styles.name}>{child.student.nombre_alumno}</Text>
                {child.student.colegio ? (
                  <Text style={styles.school}>{child.student.colegio}</Text>
                ) : null}
                {child.student.codigo ? (
                  <Text style={styles.code}>Código {child.student.codigo}</Text>
                ) : null}
                {nivelLabel ? (
                  <View style={styles.metaChip}>
                    <Text style={styles.metaChipText}>{nivelLabel}</Text>
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial de hoy</Text>
          <Text style={styles.sectionHint}>
            Todos los registros del día: recojo mañana, tarde y retorno.
          </Text>
          <ChildTimelineList events={timeline} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del alumno</Text>
          <StudentCard student={child.student} />
        </View>
      </AppScrollView>
    </SafeAreaView>
  );
}
