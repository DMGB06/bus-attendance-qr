import { Fragment, useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { HelperText, Searchbar, Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { formatTripDirectionLabel } from "@/src/features/trips/components/TripHeader";
import { RosterStudentRow } from "@/src/features/trips/components/roster/RosterStudentRow";
import { RosterSyncBanner } from "@/src/features/trips/components/roster/RosterSyncBanner";
import { useTripRoster, type RosterViewMode } from "@/src/features/trips/hooks/useTripRoster";
import { useTripStore } from "@/src/features/trips/store/tripStore";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { useScrollBottomPadding } from "@/src/core/theme/useScrollBottomPadding";

type RosterChipFilter = Extract<RosterViewMode, "all" | "pending" | "attended">;

const CHIP_FILTERS: { id: RosterChipFilter; label: (pendingCount: number) => string }[] = [
  { id: "all", label: () => "Todos" },
  { id: "pending", label: (pendingCount) => `Pendientes (${pendingCount})` },
  { id: "attended", label: () => "Asistieron" },
];

const STAT_FILTERS: { id: RosterViewMode; label: string }[] = [
  { id: "attended", label: "Asistieron" },
  { id: "onboard", label: "En bus" },
  { id: "pending", label: "Pendientes" },
];

export default function RosterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useAppTheme();
  const scrollBottom = useScrollBottomPadding(tokens.spacing.md);
  const { activeTrip } = useTripStore();
  const roster = useTripRoster(activeTrip?.id);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.screenSolid,
        },
        listWrap: {
          flex: 1,
          minHeight: 0,
          paddingTop: tokens.spacing.sm,
        },
        centerFill: {
          flex: 1,
          justifyContent: "center",
          minHeight: tokens.layout.emptyStateMinHeight,
          paddingHorizontal: tokens.spacing.lg,
        },
        toolbar: {
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.md,
          gap: tokens.spacing.md,
        },
        header: {
          gap: tokens.spacing.xs,
        },
        title: {
          ...tokens.typography.title2,
          color: colors.textTitle,
        },
        subtitle: {
          ...tokens.typography.body,
          color: colors.textMuted,
        },
        statsBar: {
          flexDirection: "row",
          backgroundColor: colors.primary,
          borderRadius: tokens.radius.md,
          overflow: "hidden",
        },
        statCell: {
          flex: 1,
          alignItems: "center",
          paddingVertical: tokens.spacing.md,
          gap: 2,
        },
        statCellActive: {
          backgroundColor: "rgba(255, 255, 255, 0.14)",
        },
        statLabelActive: {
          color: colors.textOnPrimary,
        },
        statDivider: {
          width: 1,
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          marginVertical: tokens.spacing.sm,
        },
        statValue: {
          ...tokens.typography.title2,
          color: colors.textOnPrimary,
        },
        statLabel: {
          ...tokens.typography.overline,
          color: "rgba(255, 255, 255, 0.75)",
          letterSpacing: 0.3,
        },
        filterBar: {
          flexDirection: "row",
          backgroundColor: colors.surfaceTrack,
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.xs,
          gap: tokens.spacing.xs,
        },
        filterButton: {
          flex: 1,
          alignItems: "center",
          paddingVertical: tokens.spacing.sm,
          borderRadius: tokens.radius.sm,
        },
        filterButtonActive: {
          backgroundColor: colors.surfaceCard,
        },
        filterLabel: {
          ...tokens.typography.label,
          color: colors.textMuted,
          textAlign: "center",
        },
        filterLabelActive: {
          color: colors.textTitle,
        },
        search: {
          backgroundColor: colors.surfaceCard,
          borderRadius: tokens.radius.md,
          borderWidth: 1,
          borderColor: colors.borderMuted,
          elevation: 0,
        },
        searchInput: {
          color: colors.textTitle,
          minHeight: 0,
          fontSize: tokens.fontSize.md,
        },
        listCard: {
          flex: 1,
          marginHorizontal: tokens.spacing.lg,
          marginBottom: tokens.spacing.sm,
          backgroundColor: colors.surfaceCard,
          borderRadius: tokens.radius.md,
          borderWidth: 1,
          borderColor: colors.borderMuted,
          overflow: "hidden",
        },
        listHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
          backgroundColor: colors.surfaceTrack,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderMuted,
        },
        listHeaderText: {
          ...tokens.typography.label,
          color: colors.textMuted,
        },
        listHeaderCount: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        list: {
          paddingBottom: tokens.spacing.xs,
        },
        emptyState: {
          padding: tokens.spacing.xl,
          alignItems: "center",
          gap: tokens.spacing.sm,
        },
        emptyTitle: {
          ...tokens.typography.headline,
          color: colors.textTitle,
        },
        emptyBody: {
          ...tokens.typography.body,
          color: colors.textMuted,
          textAlign: "center",
        },
        emptyButton: {
          marginTop: tokens.spacing.sm,
          backgroundColor: colors.primary,
          borderRadius: tokens.radius.md,
          paddingHorizontal: tokens.spacing.xl,
          paddingVertical: tokens.spacing.md,
        },
        emptyButtonText: {
          ...tokens.typography.bodyStrong,
          color: colors.textOnPrimary,
        },
        messages: {
          paddingHorizontal: tokens.spacing.lg,
        },
      }),
    [colors, tokens],
  );

  if (!activeTrip) {
    return (
      <SafeAreaView
        edges={["bottom", "left", "right"]}
        style={[styles.container, { paddingBottom: insets.bottom + tokens.spacing.lg }]}
      >
        <View style={styles.centerFill}>
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="bus-alert" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Sin viaje activo</Text>
            <Text style={styles.emptyBody}>Inicia un viaje para ver la lista de asistencia.</Text>
            <Pressable style={styles.emptyButton} onPress={() => router.replace("/(tabs)/trip")}>
              <Text style={styles.emptyButtonText}>Ir a inicio</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const emptyBodyByMode: Record<RosterViewMode, string> = {
    all: "No encontramos alumnos con ese filtro.",
    pending: "Todos los alumnos ya registraron asistencia.",
    onboard: "Nadie está a bordo en este momento.",
    attended: "Aún no hay estudiantes con asistencia registrada.",
  };

  const emptyBody = emptyBodyByMode[roster.viewMode];
  const listHeaderLabel =
    roster.viewMode === "pending"
      ? "Pendientes"
      : roster.viewMode === "onboard"
        ? "En bus"
        : roster.viewMode === "attended"
          ? "Asistieron"
          : "Alumnos";

  const totalShown = roster.filteredItems.length;

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={[styles.container, { paddingBottom: insets.bottom }]}
    >
      <View style={styles.toolbar}>
        <View style={styles.header}>
          <Text style={styles.title}>Lista de asistencia</Text>
          <Text style={styles.subtitle}>
            {formatTripDirectionLabel(activeTrip.direction)} · {roster.items.length} alumnos en ruta
          </Text>
        </View>

        <View style={styles.statsBar}>
          {STAT_FILTERS.map((stat, index) => {
            const isActive = roster.viewMode === stat.id;
            const count =
              stat.id === "attended"
                ? roster.stats.attendedCount
                : stat.id === "onboard"
                  ? roster.stats.onboardCount
                  : roster.stats.pendingCount;

            return (
              <Fragment key={stat.id}>
                {index > 0 ? <View style={styles.statDivider} /> : null}
                <Pressable
                  style={[styles.statCell, isActive && styles.statCellActive]}
                  onPress={() => roster.setViewMode(stat.id)}
                >
                  <Text style={styles.statValue}>{count}</Text>
                  <Text style={[styles.statLabel, isActive && styles.statLabelActive]}>
                    {stat.label}
                  </Text>
                </Pressable>
              </Fragment>
            );
          })}
        </View>

        <View style={styles.filterBar}>
          {CHIP_FILTERS.map((filter) => {
            const isActive = roster.viewMode === filter.id;
            return (
              <Pressable
                key={filter.id}
                style={[styles.filterButton, isActive && styles.filterButtonActive]}
                onPress={() => roster.setViewMode(filter.id)}
              >
                <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
                  {filter.label(roster.stats.pendingCount)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Searchbar
          placeholder="Buscar alumno o código..."
          value={roster.searchQuery}
          onChangeText={roster.setSearchQuery}
          style={styles.search}
          inputStyle={styles.searchInput}
          elevation={0}
          iconColor={colors.textMuted}
        />
      </View>

      <RosterSyncBanner
        isShowingCache={roster.isShowingCache}
        cacheSavedAt={roster.cacheSavedAt}
        pendingSyncCount={roster.pendingSyncCount}
      />

      <View style={styles.messages}>
        {roster.errorMessage ? <HelperText type="error">{roster.errorMessage}</HelperText> : null}
        {roster.infoMessage ? <HelperText type="info">{roster.infoMessage}</HelperText> : null}
      </View>

      <View style={styles.listWrap}>
        {roster.isLoading && roster.items.length === 0 ? (
          <View style={styles.centerFill}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : !roster.isLoading && roster.filteredItems.length === 0 ? (
          <View style={styles.centerFill}>
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Sin resultados</Text>
              <Text style={styles.emptyBody}>{emptyBody}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.listCard}>
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>{listHeaderLabel}</Text>
              <Text style={styles.listHeaderCount}>{totalShown} mostrados</Text>
            </View>
            <FlatList
              data={roster.filteredItems}
              keyExtractor={(item) => item.student.id}
              renderItem={({ item }) => (
                <RosterStudentRow
                  item={item}
                  onMarkExit={roster.handleExitMark}
                  isMarkingExit={roster.isMarkingStudentId === item.student.id}
                />
              )}
              contentContainerStyle={[styles.list, { paddingBottom: scrollBottom }]}
              refreshing={roster.isRefreshing}
              onRefresh={() => void roster.loadRoster()}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
