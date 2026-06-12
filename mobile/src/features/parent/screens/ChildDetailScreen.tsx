import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import {
  formatLastUpdatedAt,
  mapStudentTripStatusToPresentation,
} from "@/src/features/parent/domain/student-status.mapper";
import { ChildStatusBadge, ChildStatusIcon } from "@/src/features/parent/components/ChildStatusBadge";
import { ChildTimelineList } from "@/src/features/parent/components/ChildTimelineList";
import { useChildDetail } from "@/src/features/parent/hooks/useChildDetail";
import { StudentCard } from "@/src/features/trips/components/StudentCard";
import { formatTurnTypeLabel } from "@/src/features/trips/domain/trip-labels";
import { AppScrollView } from "@/src/shared/ui/AppScrollView";

export default function ChildDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const studentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { colors, tokens } = useAppTheme();
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
        topBar: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
          gap: tokens.spacing.sm,
        },
        backButton: {
          width: 40,
          height: 40,
          borderRadius: tokens.radius.full,
          alignItems: "center",
          justifyContent: "center",
        },
        topTitle: {
          flex: 1,
          ...tokens.typography.headline,
          color: colors.textTitle,
        },
        loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        },
        content: {
          paddingHorizontal: tokens.spacing.lg,
          paddingBottom: tokens.spacing.lg,
          gap: tokens.spacing.lg,
        },
        heroCard: {
          backgroundColor: colors.surfaceCard,
          borderRadius: tokens.radius.xl,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          padding: tokens.spacing.lg,
          gap: tokens.spacing.md,
        },
        heroRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.md,
        },
        heroAvatar: {
          width: 56,
          height: 56,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.primarySoftBg,
          alignItems: "center",
          justifyContent: "center",
        },
        heroText: {
          flex: 1,
          gap: tokens.spacing.xs,
        },
        name: {
          ...tokens.typography.title2,
          color: colors.textTitle,
        },
        meta: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        statusTitle: {
          ...tokens.typography.bodyStrong,
          color: colors.textTitle,
        },
        statusSubtitle: {
          ...tokens.typography.body,
          color: colors.textBody,
        },
        sectionTitle: {
          ...tokens.typography.headline,
          color: colors.textTitle,
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating size={36} color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!child) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textTitle} />
          </Pressable>
          <Text style={styles.topTitle}>Detalle</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.error}>{error ?? "No se encontró el alumno."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const presentation = mapStudentTripStatusToPresentation(
    child.todayStatus?.status ?? null,
    child.todayStatus?.direction ?? child.activeTrip?.direction ?? null,
  );
  const lastUpdated = formatLastUpdatedAt(child.todayStatus?.last_event_at);
  const segmentLabel = child.activeTrip?.turn_type
    ? formatTurnTypeLabel(child.activeTrip.turn_type)
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Volver"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textTitle} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          {child.student.nombre_alumno}
        </Text>
      </View>

      <AppScrollView
        contentContainerStyle={styles.content}
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
          <View style={styles.heroRow}>
            <View style={styles.heroAvatar}>
              <ChildStatusIcon icon={presentation.icon} tone={presentation.tone} />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.name}>{child.student.nombre_alumno}</Text>
              <Text style={styles.meta}>
                {[child.student.colegio, child.student.codigo].filter(Boolean).join(" · ")}
              </Text>
            </View>
          </View>

          <ChildStatusBadge label={presentation.label} tone={presentation.tone} />
          <Text style={styles.statusTitle}>{presentation.label}</Text>
          <Text style={styles.statusSubtitle}>{presentation.subtitle}</Text>
          {segmentLabel ? <Text style={styles.meta}>Tramo hoy: {segmentLabel}</Text> : null}
          {lastUpdated ? <Text style={styles.meta}>Actualizado a las {lastUpdated}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial de hoy</Text>
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
