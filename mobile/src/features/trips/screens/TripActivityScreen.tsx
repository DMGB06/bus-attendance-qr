import { useCallback, useMemo } from "react";
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { HelperText, Searchbar, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { ActivityDaySelector } from "@/src/features/trips/components/ActivityDaySelector";
import { ActivityTripSection } from "@/src/features/trips/components/ActivityTripSection";
import { useOperatorActivityHistory } from "@/src/features/trips/hooks/useOperatorActivityHistory";
import { AppScrollView } from "@/src/shared/ui/AppScrollView";
import { useScreenPerfMark } from "@/src/shared/hooks/useScreenPerfMark";

export default function TripActivityScreen() {
  useScreenPerfMark("activity");
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
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
        header: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.xl,
          paddingTop: tokens.spacing.md,
          paddingBottom: tokens.spacing.sm,
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
        searchWrap: {
          paddingHorizontal: tokens.spacing.xl,
        },
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
        content: {
          gap: tokens.spacing.lg,
          paddingBottom: tokens.spacing.md,
        },
        empty: {
          ...tokens.typography.body,
          color: colors.textMuted,
          textAlign: "center",
          paddingHorizontal: tokens.spacing.xl,
          paddingVertical: tokens.spacing.xl,
        },
        dayBlock: {
          gap: tokens.spacing.lg,
        },
        dayTitle: {
          ...tokens.typography.label,
          color: colors.textMuted,
          paddingHorizontal: tokens.spacing.xl,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        },
        sections: {
          gap: tokens.spacing.lg,
        },
      }),
    [colors, tokens],
  );

  if (loading) {
    return (
      <SafeAreaView edges={["bottom", "left", "right"]} style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={styles.safeArea}>
      <AppScrollView
        extraBottomInset={tokens.spacing.lg}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
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
          />
        ) : null}

        {error ? <HelperText type="error">{error}</HelperText> : null}

        {visibleDays.length === 0 ? (
          <Text style={styles.empty}>{emptyMessage}</Text>
        ) : (
          visibleDays.map((day) => (
            <View key={day.date} style={styles.dayBlock}>
              {isSearchActive ? <Text style={styles.dayTitle}>{day.dateLabel}</Text> : null}
              <View style={styles.sections}>
                {day.trips.map((trip) => (
                  <ActivityTripSection key={`${day.date}-${trip.tripId}`} trip={trip} />
                ))}
              </View>
            </View>
          ))
        )}
      </AppScrollView>
    </SafeAreaView>
  );
}
