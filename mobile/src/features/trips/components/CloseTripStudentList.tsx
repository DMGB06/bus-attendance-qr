import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { CloseTripStudentRef } from "@/src/features/trips/domain/close-trip-validation";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";

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

  const palette = useMemo(
    () =>
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
          },
    [tone, colors],
  );

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
        row: {
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

  if (students.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="alert-outline" size={20} color={palette.icon} />
        <Text style={styles.title}>{title}</Text>
      </View>

      {students.map((student, index) => (
        <View
          key={student.id}
          style={[styles.row, index === students.length - 1 && styles.rowLast]}
        >
          <Text style={styles.name}>{student.nombre_alumno}</Text>
          <Text style={styles.stop} numberOfLines={1}>
            {student.direccion?.trim() || "Sin parada registrada"}
          </Text>
        </View>
      ))}
    </View>
  );
}
