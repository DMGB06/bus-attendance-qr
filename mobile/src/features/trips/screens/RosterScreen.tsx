import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { HelperText, Searchbar, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useNetworkStatus } from "@/src/core/connectivity/useNetworkStatus";
import { NoActiveTripView } from "@/src/features/trips/components/NoActiveTripView";
import { MorningRiderReminderBanner } from "@/src/features/trips/components/MorningRiderReminderBanner";
import { RosterTurnHintBanner } from "@/src/features/trips/components/roster/RosterTurnHintBanner";
import { RosterStudentRow } from "@/src/features/trips/components/roster/RosterStudentRow";
import { RosterSyncBanner } from "@/src/features/trips/components/roster/RosterSyncBanner";
import { useAppCapabilities } from "@/src/features/auth/hooks/useAppCapabilities";
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
import { useScreenPerfMark } from "@/src/shared/hooks/useScreenPerfMark";
import { AppButton } from "@/src/shared/ui/AppButton";
import { HeaderStats } from "@/src/shared/ui/HeaderStats";
import { WaveHeader } from "@/src/shared/ui/WaveHeader";

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
  const { colors, tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarInset = tokens.layout.tabBarBaseHeight + insets.bottom;
  const { activeTrip } = useTripStore();
  const { isOffline } = useNetworkStatus();
  const roster = useTripRoster(activeTrip?.id);
  const { capabilities } = useAppCapabilities();
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
        },
        centerFill: {
          flex: 1,
          justifyContent: "center",
          minHeight: tokens.layout.emptyStateMinHeight,
          paddingHorizontal: tokens.spacing.lg,
        },
        toolbar: {
          paddingHorizontal: tokens.spacing.lg,
          paddingBottom: tokens.spacing.sm,
          gap: tokens.spacing.sm,
        },
        searchToggle: {
          width: 44,
          height: 44,
          borderRadius: tokens.radius.full,
          alignItems: "center",
          justifyContent: "center",
        },
        searchToggleActive: {
          backgroundColor: colors.headerStatBg,
        },
        filterBar: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: tokens.spacing.xs,
        },
        filterButton: {
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 44,
          paddingHorizontal: tokens.spacing.sm,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.surfaceTrack,
        },
        filterButtonActive: {
          backgroundColor: colors.headerBg,
        },
        filterLabel: {
          ...tokens.typography.label,
          color: colors.textBody,
          textAlign: "center",
        },
        filterLabelActive: {
          color: colors.onHeader,
        },
        listHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: tokens.spacing.xs,
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
          overflow: "hidden",
        },
        listFill: {
          flex: 1,
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
      roster,
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
      edges={["left", "right"]}
      style={[styles.container, { paddingBottom: tabBarInset }]}
    >
      <WaveHeader
        title={roster.viewMode === "prioritarios" ? "Vino en la mañana" : "Lista"}
        subtitle={roster.viewMode === "prioritarios" ? null : rosterSubtitle}
        onBack={roster.viewMode === "prioritarios" ? () => roster.setViewMode("pending") : undefined}
        right={
          <Pressable
            style={[
              styles.searchToggle,
              (searchOpen || roster.searchQuery.length > 0) && styles.searchToggleActive,
            ]}
            onPress={() => setSearchOpen((open) => {
                if (open) {
                  roster.setSearchQuery("");
                }
                return !open;
              })}
            accessibilityRole="button"
            accessibilityLabel="Buscar alumno"
          >
            <MaterialCommunityIcons name="magnify" size={24} color={colors.onHeader} />
          </Pressable>
        }
      >
        {roster.viewMode !== "prioritarios" ? (
          <HeaderStats
            items={statFilters.map((statId) => ({
              key: statId,
              value: statCountByMode(statId),
              label: getStatFilterLabel(statId, tripDirection),
              active: roster.viewMode === statId,
              onPress: () => roster.setViewMode(statId),
            }))}
          />
        ) : null}
      </WaveHeader>

      <View style={styles.toolbar}>
        {roster.viewMode !== "prioritarios" ? (
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
        ) : null}

        <RosterTurnHintBanner turnType={activeTrip.turn_type} />

        {roster.isAfternoonReturn && roster.viewMode !== "prioritarios" ? (
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

        {capabilities.canBulkDropoff && roster.totalOnboardCount > 0 ? (
          <AppButton
            icon={activeTrip.direction === "recojo" ? "school" : "home"}
            loading={roster.isBulkDropping}
            disabled={roster.isBulkDropping}
            onPress={() => void roster.handleBulkDropoff()}
          >
            {activeTrip.direction === "recojo"
              ? `Dejar todos en colegio (${roster.totalOnboardCount})`
              : `Dejar todos en casa (${roster.totalOnboardCount})`}
          </AppButton>
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
        ) : roster.errorMessage && roster.items.length === 0 ? (
          <View style={styles.centerFill}>
            <AppButton onPress={() => void roster.loadRoster()}>Reintentar</AppButton>
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
              initialNumToRender={12}
              maxToRenderPerBatch={8}
              windowSize={7}
              removeClippedSubviews
              updateCellsBatchingPeriod={50}
              style={styles.listFill}
              contentContainerStyle={[styles.list, { paddingBottom: tokens.spacing.md }]}
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
