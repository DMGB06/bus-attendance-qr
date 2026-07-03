import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { Student } from "@/src/features/trips/types";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";

interface StudentCardProps {
  student: Student;
  statusLabel?: string;
}

function formatValue(value: string | null | undefined) {
  return value?.trim() ? value : "Sin dato en padrón";
}

const INFO_ROWS = [
  { key: "colegio", icon: "school-outline", label: "Colegio", field: "colegio" as const },
  { key: "apoderado", icon: "account-heart-outline", label: "Apoderado", field: "nombre_apoderado" as const },
  { key: "telefono", icon: "phone-outline", label: "Tel. apoderado", field: "telefono_apoderado" as const },
  { key: "direccion", icon: "map-marker-outline", label: "Dirección", field: "direccion" as const },
] as const;

export function StudentCard({ student }: StudentCardProps) {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surfaceCard,
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.md,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          gap: tokens.spacing.sm,
        },
        infoRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: tokens.spacing.sm,
        },
        infoText: {
          flex: 1,
          ...tokens.typography.caption,
          color: colors.textBody,
        },
      }),
    [colors, tokens],
  );

  return (
    <View style={styles.card}>
      {INFO_ROWS.map((row) => (
        <View key={row.key} style={styles.infoRow}>
          <MaterialCommunityIcons
            name={row.icon}
            size={tokens.fontSize.md}
            color={colors.sky}
          />
          <Text style={styles.infoText}>
            {row.label}: {formatValue(student[row.field])}
          </Text>
        </View>
      ))}
    </View>
  );
}
