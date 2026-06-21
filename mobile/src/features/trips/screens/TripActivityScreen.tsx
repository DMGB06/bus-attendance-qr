import { useCallback, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from "react-native";
import { HelperText, Searchbar, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { useTabSceneBottomInset } from "@/src/core/theme/useScrollBottomPadding";
import { ActivityDaySelector } from "@/src/features/trips/components/ActivityDaySelector";
import { ActivityEventRow } from "@/src/features/trips/components/ActivityEventRow";
import { ActivitySectionHeader } from "@/src/features/trips/components/ActivitySectionHeader";
import { ActivityStudentGroupRow } from "@/src/features/trips/components/ActivityStudentGroupRow";
import {
  buildActivityListSections,
  getActivityListSummary,
  isStudentActivitySection,
  type ActivityListSection,
} from "@/src/features/trips/domain/activity-list.sections";
import { useActivityStudentExpansion } from "@/src/features/trips/hooks/useActivityStudentExpansion";
import { useOperatorActivityHistory } from "@/src/features/trips/hooks/useOperatorActivityHistory";
import type {
  ActivityStudentGroup,
  OperatorActivityRow,
} from "@/src/features/trips/types/activity.types";
import { useScreenPerfMark } from "@/src/shared/hooks/useScreenPerfMark";

type ActivityListItem = OperatorActivityRow | ActivityStudentGroup;

export default function TripActivityScreen() {
  useScreenPerfMark("activity");
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const tabBarInset = useTabSceneBottomInset();
  const { isExpanded, toggle, collapseAll } = useActivityStudentExpansion();
  const {
    dayOptions,
    selectedDate,
    setSelectedDate,
    searchQuery,
    setSearchQuery,
    isSearchActive,
    visibleDays,
    emptyMessage,
    loading,
    refreshing,
    error,
    refresh,
  } = useOperatorActivityHistory();

  const groupByStudent = true;

  const sections = useMemo(
    () =>
      buildActivityListSections(visibleDays, {
        includeDayInTitle: isSearchActive,
        groupByStudent,
      }),
    [groupByStudent, isSearchActive, visibleDays],
  );

  const summary = useMemo(() => getActivityListSummary(visibleDays), [visibleDays]);
  const listFillsScreen = summary.studentCount > 8;

  useEffect(() => {
    collapseAll();
  }, [collapseAll, groupByStudent, selectedDate]);

  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const keyExtractor = useCallback((item: ActivityListItem) => {
    if ("listKey" in item && "events" in item) {
      return item.listKey;
    }

    return (item as OperatorActivityRow).recordId;
  }, []);

  const renderItem = useCallback(
    ({ item, section }: { item: ActivityListItem; section: ActivityListSection }) => {
      if (isStudentActivitySection(section)) {
        const group = item as ActivityStudentGroup;

        return (
          <ActivityStudentGroupRow
            group={group}
            expanded={isExpanded(group.listKey)}
            onToggle={() => toggle(group.listKey)}
          />
        );
      }

      return <ActivityEventRow event={item as OperatorActivityRow} />;
    },
    [isExpanded, toggle],
  );

  const renderSectionHeader = useCallback(({ section }: { section: ActivityListSection }) => {
    if (isStudentActivitySection(section)) {
      return (
        <ActivitySectionHeader
          title={section.title}
          count={section.studentCount}
          countUnit="alumnos"
        />
      );
    }

    return (
      <ActivitySectionHeader
        title={section.title}
        count={section.eventCount}
        countUnit="registros"
      />
    );
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: colors.screenSolid,
        },
        contentShell: {
          flex: 1,
          width: "100%",
          maxWidth: 520,
          alignSelf: "center",
          paddingHorizontal: tokens.spacing.xl,
        },
        loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        },
        topBar: {
          gap: tokens.spacing.md,
          paddingBottom: tokens.spacing.sm,
          flexShrink: 0,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
          paddingTop: tokens.spacing.md,
        },
        backButton: {
          width: 40,
          height: 40,
          borderRadius: tokens.radius.full,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surfaceListItem,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
        },
        title: {
          ...tokens.typography.title2,
          color: colors.textTitle,
          flex: 1,
        },
        searchWrap: {},
        search: {
          backgroundColor: colors.surfaceListItem,
          borderRadius: tokens.radius.lg,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
        },
        searchInput: {
          ...tokens.typography.body,
          color: colors.textBody,
          minHeight: 0,
        },
        summaryBar: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
          backgroundColor: colors.surfaceListItem,
          borderRadius: tokens.radius.lg,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
        },
        summaryText: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        listCard: {
          marginTop: tokens.spacing.sm,
          marginBottom: tokens.spacing.sm,
          borderRadius: tokens.radius.lg,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          overflow: "hidden",
          backgroundColor: colors.surfaceListItem,
        },
        listCardExpanded: {
          flex: 1,
        },
        listHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderMuted,
          backgroundColor: colors.surfaceListItem,
        },
        listHeaderText: {
          ...tokens.typography.label,
          color: colors.textMuted,
        },
        listHeaderCount: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        empty: {
          ...tokens.typography.body,
          color: colors.textMuted,
          textAlign: "center",
          paddingVertical: tokens.spacing.xl,
        },
        errorWrap: {},
      }),
    [colors, tokens],
  );

  const summaryLabel = useMemo(() => {
    if (summary.eventCount === 0) {
      return null;
    }

    const tripsLabel = summary.tripCount === 1 ? "1 viaje" : `${summary.tripCount} viajes`;
    const eventsLabel =
      summary.eventCount === 1 ? "1 registro" : `${summary.eventCount} registros`;

    if (isSearchActive) {
      return null;
    }

    const studentsLabel =
      summary.studentCount === 1 ? "1 alumno" : `${summary.studentCount} alumnos`;

    return `${studentsLabel} · ${eventsLabel} · ${tripsLabel}`;
  }, [isSearchActive, summary.eventCount, summary.studentCount, summary.tripCount]);

  const listHeaderCountLabel = useMemo(() => {
    const studentsLabel =
      summary.studentCount === 1 ? "1 alumno" : `${summary.studentCount} alumnos`;
    const eventsLabel =
      summary.eventCount === 1 ? "1 registro" : `${summary.eventCount} registros`;
    return `${studentsLabel} · ${eventsLabel}`;
  }, [summary.eventCount, summary.studentCount]);

  if (loading) {
    return (
      <SafeAreaView edges={["left", "right"]} style={[styles.safeArea, { paddingBottom: tabBarInset }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["left", "right"]} style={[styles.safeArea, { paddingBottom: tabBarInset }]}>
      <View style={styles.contentShell}>
        <View style={styles.topBar}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver"
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textTitle} />
            </Pressable>
            <Text style={styles.title}>Historial</Text>
          </View>

          <View style={styles.searchWrap}>
            <Searchbar
              placeholder="Buscar alumno..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.search}
              inputStyle={styles.searchInput}
              elevation={0}
              iconColor={colors.textBody}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {!isSearchActive ? (
            <ActivityDaySelector
              options={dayOptions}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              embedded
            />
          ) : null}

          {error ? (
            <View style={styles.errorWrap}>
              <HelperText type="error">{error}</HelperText>
            </View>
          ) : null}

          {summaryLabel && !isSearchActive ? (
            <View style={styles.summaryBar}>
              <Text style={styles.summaryText}>{summaryLabel}</Text>
            </View>
          ) : null}
        </View>

        {sections.length === 0 ? (
          <Text style={styles.empty}>{emptyMessage}</Text>
        ) : (
          <View style={[styles.listCard, listFillsScreen && styles.listCardExpanded]}>
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>
                {isSearchActive ? "Resultados" : "Alumnos"}
              </Text>
              <Text style={styles.listHeaderCount}>{listHeaderCountLabel}</Text>
            </View>
            <SectionList
              sections={sections}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              stickySectionHeadersEnabled={listFillsScreen}
              initialNumToRender={listFillsScreen ? 10 : 16}
              maxToRenderPerBatch={10}
              windowSize={listFillsScreen ? 5 : 8}
              removeClippedSubviews={Platform.OS === "android"}
              updateCellsBatchingPeriod={50}
              showsVerticalScrollIndicator={listFillsScreen}
              style={listFillsScreen ? { flex: 1 } : undefined}
              contentContainerStyle={
                listFillsScreen
                  ? { paddingBottom: tokens.spacing.md }
                  : { paddingBottom: tokens.spacing.sm, flexGrow: 0 }
              }
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
