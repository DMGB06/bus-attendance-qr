import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";

type ActivitySectionHeaderProps = {
  title: string;
  count: number;
  countUnit?: "registros" | "alumnos";
};

function formatCountLabel(count: number, unit: "registros" | "alumnos"): string {
  if (unit === "alumnos") {
    return count === 1 ? "1 alumno" : `${count} alumnos`;
  }

  return count === 1 ? "1 registro" : `${count} registros`;
}

export function ActivitySectionHeader({
  title,
  count,
  countUnit = "registros",
}: ActivitySectionHeaderProps) {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colors.surfaceTrack,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderMuted,
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.sm,
          minHeight: 36,
        },
        title: {
          ...tokens.typography.label,
          color: colors.textTitle,
          flex: 1,
        },
        count: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
      }),
    [colors, tokens],
  );

  return (
    <View style={styles.header}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.count}>{formatCountLabel(count, countUnit)}</Text>
    </View>
  );
}
