import { useMemo } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, HelperText, Searchbar, Text } from "react-native-paper";
import { useRouter } from "expo-router";

import { formatTripDirectionLabel } from "@/src/features/trips/components/TripHeader";
import { RosterStudentRow } from "@/src/features/trips/components/roster/RosterStudentRow";
import { useTripRoster } from "@/src/features/trips/hooks/useTripRoster";
import { useTripStore } from "@/src/features/trips/store/tripStore";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { useScrollBottomPadding } from "@/src/core/theme/useScrollBottomPadding";

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
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.md,
          gap: tokens.spacing.sm,
        },
        listWrap: {
          flex: 1,
          minHeight: 0,
        },
        centerFill: {
          flex: 1,
          justifyContent: "center",
          minHeight: tokens.layout.emptyStateMinHeight,
        },
        header: {
          gap: tokens.spacing.xs,
        },
        title: {
          ...tokens.typography.title1,
          color: colors.textTitle,
        },
        subtitle: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        search: {
          backgroundColor: colors.surfaceCard,
          borderRadius: tokens.radius.md,
        },
        searchInput: {
          color: colors.textTitle,
          minHeight: 0,
        },
        filterRow: {
          flexDirection: "row",
          gap: tokens.spacing.sm,
        },
        summaryRow: {
          flexDirection: "row",
          gap: tokens.spacing.sm,
        },
        summaryCard: {
          flex: 1,
          backgroundColor: colors.surfaceCard,
          borderColor: colors.borderDefault,
        },
        summaryContent: {
          alignItems: "center",
          gap: tokens.spacing.xs,
        },
        summaryValue: {
          ...tokens.typography.title2,
          color: colors.textTitle,
        },
        summaryLabel: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        list: {
          paddingBottom: tokens.spacing.md,
        },
        listView: {
          flex: 1,
        },
        emptyStateCard: {
          backgroundColor: colors.surfaceCard,
          borderColor: colors.borderDefault,
        },
        emptyContent: {
          alignItems: "center",
          gap: tokens.spacing.sm,
          paddingVertical: tokens.spacing.xl,
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
        separator: {
          height: tokens.spacing.sm,
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
        <Card mode="outlined" style={styles.emptyStateCard}>
          <Card.Content style={styles.emptyContent}>
            <Text style={styles.emptyTitle}>Sin viaje activo</Text>
            <Text style={styles.emptyBody}>Inicia un viaje para ver la lista de asistencia.</Text>
            <Button mode="contained" onPress={() => router.replace("/(tabs)/trip")}>
              Ir a inicio
            </Button>
          </Card.Content>
        </Card>
      </SafeAreaView>
    );
  }

  const emptyBody =
    roster.viewMode === "attended"
      ? "Aún no hay estudiantes con asistencia registrada."
      : "No encontramos alumnos con ese filtro.";

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={[styles.container, { paddingBottom: insets.bottom + tokens.spacing.sm }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Lista de Asistencia</Text>
        <Text style={styles.subtitle}>Viaje {formatTripDirectionLabel(activeTrip.direction)}</Text>
      </View>

      <Searchbar
        placeholder="Buscar por nombre, código o ID..."
        value={roster.searchQuery}
        onChangeText={roster.setSearchQuery}
        style={styles.search}
        inputStyle={styles.searchInput}
      />

      <View style={styles.filterRow}>
        <Button
          mode={roster.viewMode === "all" ? "contained" : "outlined"}
          onPress={() => roster.setViewMode("all")}
        >
          Todos
        </Button>
        <Button
          mode={roster.viewMode === "attended" ? "contained" : "outlined"}
          onPress={() => roster.setViewMode("attended")}
        >
          Asistieron
        </Button>
      </View>

      <View style={styles.summaryRow}>
        <Card mode="outlined" style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <Text style={styles.summaryValue}>{roster.stats.attendedCount}</Text>
            <Text style={styles.summaryLabel}>Asistieron</Text>
          </Card.Content>
        </Card>
        <Card mode="outlined" style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <Text style={styles.summaryValue}>{roster.stats.onboardCount}</Text>
            <Text style={styles.summaryLabel}>En bus</Text>
          </Card.Content>
        </Card>
        <Card mode="outlined" style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <Text style={styles.summaryValue}>{roster.stats.pendingCount}</Text>
            <Text style={styles.summaryLabel}>Pendientes</Text>
          </Card.Content>
        </Card>
      </View>

      {roster.errorMessage ? <HelperText type="error">{roster.errorMessage}</HelperText> : null}
      {roster.infoMessage ? <HelperText type="info">{roster.infoMessage}</HelperText> : null}

      <View style={styles.listWrap}>
        {roster.isLoading && roster.items.length === 0 ? (
          <View style={styles.centerFill}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : !roster.isLoading && roster.filteredItems.length === 0 ? (
          <View style={styles.centerFill}>
            <Card mode="outlined" style={styles.emptyStateCard}>
              <Card.Content style={styles.emptyContent}>
                <Text style={styles.emptyTitle}>Sin resultados</Text>
                <Text style={styles.emptyBody}>{emptyBody}</Text>
              </Card.Content>
            </Card>
          </View>
        ) : (
          <FlatList
            data={roster.filteredItems}
            keyExtractor={(item) => item.student.id}
            renderItem={({ item }) => (
              <RosterStudentRow
                item={item}
                onMarkManual={roster.handleManualMark}
                onMarkExit={roster.handleExitMark}
                isMarkingManual={roster.isMarkingStudentId === item.student.id}
                isMarkingExit={roster.isMarkingStudentId === item.student.id}
              />
            )}
            contentContainerStyle={[styles.list, { paddingBottom: scrollBottom }]}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshing={roster.isLoading}
            onRefresh={() => void roster.loadRoster()}
            style={styles.listView}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
