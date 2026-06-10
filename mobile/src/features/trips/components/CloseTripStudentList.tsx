import { useCallback, useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { CloseTripStudentRef } from "@/src/features/trips/domain/close-trip-validation";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";

const CLOSE_TRIP_ROW_HEIGHT = 56;
const CLOSE_TRIP_LIST_MAX_HEIGHT = 280;

type CloseTripStudentListProps = {
  title: string;
  students: CloseTripStudentRef[];
  tone?: "danger" | "warning";
};

export function CloseTripStudentList({
  title,
  students,
  tone = "danger",
}: CloseTripStudentListProps) {
  const { colors, tokens } = useAppTheme();

  const palette =
    tone === "danger"
      ? {
          cardBg: "rgba(197, 48, 48, 0.08)",
          cardBorder: colors.attendancePending,
          title: colors.attendancePending,
          icon: colors.attendancePending,
          name: colors.textTitle,
          stop: colors.textMuted,
        }
      : {
          cardBg: colors.feedbackWarningBg,
          cardBorder: colors.feedbackWarningBorder,
          title: colors.feedbackWarningTitle,
          icon: colors.feedbackWarningGlyph,
          name: colors.feedbackWarningTitle,
          stop: colors.feedbackWarningBody,
        };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: palette.cardBg,
          borderRadius: tokens.radius.xl,
          borderWidth: 1,
          borderColor: palette.cardBorder,
          padding: tokens.spacing.md,
          gap: tokens.spacing.sm,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
        },
        title: {
          ...tokens.typography.headline,
          color: palette.title,
          flex: 1,
        },
        list: {
          flexGrow: 0,
        },
        listScrollable: {
          maxHeight: CLOSE_TRIP_LIST_MAX_HEIGHT,
        },
        row: {
          height: CLOSE_TRIP_ROW_HEIGHT,
          justifyContent: "center",
          gap: 2,
          paddingVertical: tokens.spacing.xs,
          borderBottomWidth: 1,
          borderBottomColor: palette.cardBorder,
        },
        rowLast: {
          borderBottomWidth: 0,
        },
        name: {
          ...tokens.typography.bodyStrong,
          color: palette.name,
        },
        stop: {
          ...tokens.typography.caption,
          color: palette.stop,
        },
      }),
    [palette, tokens],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: CLOSE_TRIP_ROW_HEIGHT,
      offset: CLOSE_TRIP_ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: CloseTripStudentRef; index: number }) => (
      <View style={[styles.row, index === students.length - 1 && styles.rowLast]}>
        <Text style={styles.name}>{item.nombre_alumno}</Text>
        <Text style={styles.stop} numberOfLines={1}>
          {item.direccion?.trim() || "Sin parada registrada"}
        </Text>
      </View>
    ),
    [students.length, styles.name, styles.row, styles.rowLast, styles.stop],
  );

  if (students.length === 0) {
    return null;
  }

  const needsScroll = students.length * CLOSE_TRIP_ROW_HEIGHT > CLOSE_TRIP_LIST_MAX_HEIGHT;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="alert-outline" size={20} color={palette.icon} />
        <Text style={styles.title}>{title}</Text>
      </View>

      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        style={[styles.list, needsScroll && styles.listScrollable]}
        scrollEnabled={needsScroll}
        nestedScrollEnabled={needsScroll}
        initialNumToRender={8}
        maxToRenderPerBatch={12}
        windowSize={5}
        removeClippedSubviews
      />
    </View>
  );
}
