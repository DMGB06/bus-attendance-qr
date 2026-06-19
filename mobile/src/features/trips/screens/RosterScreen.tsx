import { Fragment, useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { HelperText, Searchbar, Text, Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useNetworkStatus } from "@/src/core/connectivity/useNetworkStatus";
import { NoActiveTripView } from "@/src/features/trips/components/NoActiveTripView";
import { MorningRiderReminderBanner } from "@/src/features/trips/components/MorningRiderReminderBanner";
import { RosterTurnHintBanner } from "@/src/features/trips/components/roster/RosterTurnHintBanner";
import { RosterStudentRow } from "@/src/features/trips/components/roster/RosterStudentRow";
import { ROSTER_ROW_HEIGHT } from "@/src/features/trips/components/roster/rosterRowTheme";
import { RosterSyncBanner } from "@/src/features/trips/components/roster/RosterSyncBanner";
import { useTripRoster, type RosterViewMode } from "@/src/features/trips/hooks/useTripRoster";
import {
  getDropoffLabel,
  getRosterCompletedEmptyMessage,
  getRosterListHeaderLabel,
  getRosterOnboardFilterLabel,
  getRosterPendingEmptyMessage,
  getRosterPendingFilterLabel,
  getMorningRidersEmptyMessage,
  getRosterScreenSubtitle,
} from "@/src/features/trips/domain/trip-labels";
import type { TripDirection } from "@/src/features/trips/types";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";
import { useTripStore } from "@/src/features/trips/store/tripStore";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { useScrollBottomPadding } from "@/src/core/theme/useScrollBottomPadding";
import { useScreenPerfMark } from "@/src/shared/hooks/useScreenPerfMark";

function buildChipFilters(direction: TripDirection) {
  const dropoffLabel = getDropoffLabel(direction);
  const pendingLabel = getRosterPendingFilterLabel(direction);

  return [
    { id: "all" as const, label: "Todos" },
    {
      id: "pending" as const,
      label: (count: number) => `${pendingLabel} (${count})`,
    },
    {
      id: "completed" as const,
      label: (count: number) => `${dropoffLabel} (${count})`,
    },
  ];
}

type StatFilterId = Extract<RosterViewMode, "pending" | "onboard" | "completed">;

const ROSTER_STAT_FILTER_IDS: StatFilterId[] = ["pending", "onboard", "completed"];

function getStatFilterLabel(id: StatFilterId, direction: TripDirection): string {
  switch (id) {
    case "pending":
      return getRosterPendingFilterLabel(direction);
    case "onboard":
      return getRosterOnboardFilterLabel(direction);
    case "completed":
      return getDropoffLabel(direction);
    default:
      return id;
  }
}

export default function RosterScreen() {
  useScreenPerfMark("roster");
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useAppTheme();
  const scrollBottom = useScrollBottomPadding(tokens.spacing.md);
  const { activeTrip } = useTripStore();
  const { isOffline } = useNetworkStatus();
  const roster = useTripRoster(activeTrip?.id);
  const [searchOpen, setSearchOpen] = useState(false);

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
          paddingBottom: tokens.spacing.sm,
          gap: tokens.spacing.sm,
        },
        titleRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: tokens.spacing.sm,
        },
        title: {
          ...tokens.typography.title2,
          color: colors.textTitle,
        },
        subtitle: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        searchToggle: {
          width: 40,
          height: 40,
          borderRadius: tokens.radius.full,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surfaceTrack,
        },
        searchToggleActive: {
          backgroundColor: colors.primarySoftBg,
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
          gap: 2,
          minWidth: 0,
        },
        filterButtonActive: {
          backgroundColor: colors.surfaceCard,
        },
        filterLabel: {
          ...tokens.typography.caption,
          color: colors.textMuted,
          textAlign: "center",
          fontSize: 11,
        },
        backLink: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.xs,
        },
        backLinkText: {
          ...tokens.typography.bodyStrong,
          color: colors.primary,
        },
        filterLabelActive: {
          color: colors.textTitle,
          fontWeight: "600",
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
          minWidth: 0,
        },
        statCellActive: {
          backgroundColor: "rgba(255, 255, 255, 0.14)",
        },
        statDivider: {
          width: 1,
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          marginVertical: tokens.spacing.sm,
        },
        statValue: {
          ...tokens.typography.title3,
          color: colors.textOnPrimary,
        },
        statLabel: {
          ...tokens.typography.overline,
          color: "rgba(255, 255, 255, 0.75)",
          letterSpacing: 0.3,
          textAlign: "center",
          fontSize: 10,
        },
        statLabelActive: {
          color: colors.textOnPrimary,
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
        list: {
          paddingBottom: tokens.spacing.xs,
        },
        listEmptyState: {
          padding: tokens.spacing.xl,
          alignItems: "center",
          gap: tokens.spacing.sm,
        },
        listEmptyTitle: {
          ...tokens.typography.headline,
          color: colors.textTitle,
        },
        listEmptyBody: {
          ...tokens.typography.body,
          color: colors.textMuted,
          textAlign: "center",
        },
        messages: {
          paddingHorizontal: tokens.spacing.lg,
        },
        bulkButton: {
          borderRadius: tokens.radius.md,
          backgroundColor: colors.primary,
        },
        bulkButtonContent: {
          height: tokens.layout.buttonHeight,
        },
        bulkButtonLabel: {
          ...tokens.typography.bodyStrong,
          color: colors.textOnPrimary,
        },
      }),
    [colors, tokens],
  );

  const statCountByMode = useCallback(
    (mode: StatFilterId) => {
      switch (mode) {
        case "onboard":
          return roster.stats.onboardCount;
        case "pending":
          return roster.stats.pendingCount;
        case "completed":
          return roster.stats.completedCount;
        default:
          return 0;
      }
    },
    [roster.stats],
  );

  const tripDirection = activeTrip?.direction ?? "recojo";
  const chipFilters = useMemo(() => buildChipFilters(tripDirection), [tripDirection]);
  const statFilters = useMemo(() => ROSTER_STAT_FILTER_IDS, []);

  const listHeaderLabel = useMemo(
    () => getRosterListHeaderLabel(roster.viewMode, tripDirection),
    [roster.viewMode, tripDirection],
  );

  const rosterSubtitle = useMemo(() => {
    if (!activeTrip) {
      return "";
    }
    return getRosterScreenSubtitle(activeTrip, roster.totalStudentCount);
  }, [activeTrip, roster.totalStudentCount]);

  const totalShown = roster.filteredItems.length;
  const isAfternoonReturn = roster.isAfternoonReturn;
  const viewMode = roster.viewMode;
  const rowTheme = useMemo(() => ({ colors, tokens }), [colors, tokens]);
  const showMorningHintInList =
    isAfternoonReturn && (viewMode === "prioritarios" || viewMode === "pending");

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ROSTER_ROW_HEIGHT,
      offset: ROSTER_ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  const keyExtractor = useCallback((item: TripRosterItem) => item.student.id, []);

  const renderRosterItem = useCallback(
    ({ item }: { item: TripRosterItem }) => {
      const isMorningRiderStudent = roster.isMorningRider(item.student.id);
      return (
        <RosterStudentRow
          item={item}
          tripDirection={tripDirection}
          theme={rowTheme}
          showMorningHint={showMorningHintInList && isMorningRiderStudent}
          isMorningRider={isMorningRiderStudent}
          canMarkAbsent={
            isAfternoonReturn &&
            item.status === "pending" &&
            (viewMode === "prioritarios" || isMorningRiderStudent)
          }
          canUndo={roster.canUndoItem(item)}
          canVoid={roster.canVoidItem(item)}
          onMarkExit={roster.handleExitMark}
          onMarkAbsent={roster.handleMarkAbsent}
          onUndo={roster.handleUndoRegistration}
          onVoid={roster.handleVoidRegistration}
          isMarkingExit={roster.isMarkingStudentId === item.student.id}
          isCorrecting={roster.isCorrectingStudentId === item.student.id}
        />
      );
    },
    [
      tripDirection,
      rowTheme,
      showMorningHintInList,
      isAfternoonReturn,
      viewMode,
      roster.isMorningRider,
      roster.handleExitMark,
      roster.handleMarkAbsent,
      roster.isMarkingStudentId,
      roster.isCorrectingStudentId,
      roster.canUndoItem,
      roster.canVoidItem,
      roster.handleUndoRegistration,
      roster.handleVoidRegistration,
    ],
  );

  if (!activeTrip) {
    return <NoActiveTripView context="roster" />;
  }

  const emptyBodyByMode: Record<RosterViewMode, string> = {
    all: "No hay alumnos que coincidan con la búsqueda.",
    pending: getRosterPendingEmptyMessage(tripDirection),
    onboard: `Nadie está ${tripDirection === "retorno" ? "a bordo" : "en el bus"} en este momento.`,
    completed: getRosterCompletedEmptyMessage(tripDirection),
    attended: "Aún no hay estudiantes con registro de asistencia.",
    prioritarios: getMorningRidersEmptyMessage(),
  };

  const emptyBody = emptyBodyByMode[roster.viewMode];

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={[styles.container, { paddingBottom: insets.bottom }]}
    >
      <View style={styles.toolbar}>
        <View style={styles.titleRow}>
          {roster.viewMode === "prioritarios" ? (
            <Pressable
              style={styles.backLink}
              onPress={() => roster.setViewMode("pending")}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="chevron-left" size={24} color={colors.primary} />
              <Text style={styles.title}>Vino en la mañana</Text>
            </Pressable>
          ) : (
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.title}>Lista</Text>
              {rosterSubtitle ? <Text style={styles.subtitle}>{rosterSubtitle}</Text> : null}
            </View>
          )}
          <Pressable
            style={[
              styles.searchToggle,
              (searchOpen || roster.searchQuery.length > 0) && styles.searchToggleActive,
            ]}
            onPress={() => setSearchOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel="Buscar alumno"
          >
            <MaterialCommunityIcons
              name="magnify"
              size={22}
              color={
                searchOpen || roster.searchQuery.length > 0
                  ? colors.primarySoftText
                  : colors.textBody
              }
            />
          </Pressable>
        </View>

        {roster.viewMode !== "prioritarios" ? (
          <>
            <View style={styles.statsBar}>
              {statFilters.map((statId, index) => {
                const isActive = roster.viewMode === statId;
                const count = statCountByMode(statId);

                return (
                  <Fragment key={statId}>
                    {index > 0 ? <View style={styles.statDivider} /> : null}
                    <Pressable
                      style={[styles.statCell, isActive && styles.statCellActive]}
                      onPress={() => roster.setViewMode(statId)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                    >
                      <Text style={styles.statValue}>{count}</Text>
                      <Text style={[styles.statLabel, isActive && styles.statLabelActive]}>
                        {getStatFilterLabel(statId, tripDirection)}
                      </Text>
                    </Pressable>
                  </Fragment>
                );
              })}
            </View>

            <View style={styles.filterBar}>
              {chipFilters.map((filter) => {
                const isActive = roster.viewMode === filter.id;
                const chipCount =
                  filter.id === "pending"
                    ? roster.stats.pendingCount
                    : filter.id === "completed"
                      ? roster.stats.completedCount
                      : roster.totalStudentCount;
                const chipLabel =
                  filter.id === "all" ? filter.label : filter.label(chipCount);

                return (
                  <Pressable
                    key={filter.id}
                    style={[styles.filterButton, isActive && styles.filterButtonActive]}
                    onPress={() => roster.setViewMode(filter.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                  >
                    <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
                      {chipLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        <RosterTurnHintBanner turnType={activeTrip.turn_type} />

        {roster.isAfternoonReturn ? (
          <MorningRiderReminderBanner
            count={roster.stats.morningRiderPendingCount}
            preview={roster.morningRidersPreview}
            onPress={
              roster.stats.morningRiderPendingCount > 0
                ? () => roster.setViewMode("prioritarios")
                : undefined
            }
          />
        ) : null}

        {searchOpen ? (
          <Searchbar
            placeholder="Nombre o código..."
            value={roster.searchQuery}
            onChangeText={roster.setSearchQuery}
            style={styles.search}
            inputStyle={styles.searchInput}
            elevation={0}
            iconColor={colors.textBody}
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
        ) : null}

        {roster.totalOnboardCount > 0 ? (
          <Button
            mode="contained"
            icon={activeTrip.direction === "recojo" ? "school" : "home"}
            loading={roster.isBulkDropping}
            disabled={roster.isBulkDropping}
            onPress={() => void roster.handleBulkDropoff()}
            style={styles.bulkButton}
            contentStyle={styles.bulkButtonContent}
            labelStyle={styles.bulkButtonLabel}
          >
            {activeTrip.direction === "recojo"
              ? `Dejar todos en colegio (${roster.totalOnboardCount})`
              : `Dejar todos en casa (${roster.totalOnboardCount})`}
          </Button>
        ) : null}
      </View>

      <RosterSyncBanner
        isOffline={isOffline}
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
            <View style={styles.listEmptyState}>
              <Text style={styles.listEmptyTitle}>Sin resultados</Text>
              <Text style={styles.listEmptyBody}>{emptyBody}</Text>
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
              keyExtractor={keyExtractor}
              renderItem={renderRosterItem}
              getItemLayout={getItemLayout}
              initialNumToRender={12}
              maxToRenderPerBatch={8}
              windowSize={7}
              removeClippedSubviews
              updateCellsBatchingPeriod={50}
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
