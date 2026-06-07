import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Surface, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { Student } from "@/src/features/trips/types";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";

interface StudentCardProps {
  student: Student;
  statusLabel?: string;
}

function formatValue(value: string | null | undefined) {
  return value?.trim() ? value : "No registrado";
}

export function StudentCard({ student }: StudentCardProps) {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surfaceCard,
          borderRadius: tokens.radius["2xl"],
          padding: tokens.radius.lg,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          shadowColor: colors.shadowColor,
          shadowOpacity: 0.12,
          shadowRadius: tokens.radius.lg,
          shadowOffset: { width: 0, height: tokens.spacing.sm },
          elevation: 6,
        },
        infoContainer: {
          gap: tokens.spacing.md,
        },
        infoRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: tokens.spacing.sm,
        },
        infoText: {
          flex: 1,
          ...tokens.typography.body,
          color: colors.textBody,
        },
      }),
    [colors, tokens],
  );

  return (
    <Surface style={styles.card}>
      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="school-outline"
            size={tokens.fontSize.lg}
            color={colors.primarySoftText}
          />
          <Text style={styles.infoText}>Colegio: {formatValue(student.colegio)}</Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="account-heart-outline"
            size={tokens.fontSize.lg}
            color={colors.primarySoftText}
          />
          <Text style={styles.infoText}>Apoderado: {formatValue(student.nombre_apoderado)}</Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="phone-outline"
            size={tokens.fontSize.lg}
            color={colors.primarySoftText}
          />
          <Text style={styles.infoText}>Teléfono: {formatValue(student.telefono_apoderado)}</Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={tokens.fontSize.lg}
            color={colors.primarySoftText}
          />
          <Text style={styles.infoText}>Dirección: {formatValue(student.direccion)}</Text>
        </View>
      </View>
    </Surface>
  );
}
