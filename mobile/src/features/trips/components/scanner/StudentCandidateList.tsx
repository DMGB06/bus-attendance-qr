import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Avatar, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import type { Student } from "@/src/features/trips/types";

type StudentCandidateListProps = {
  candidates: Student[];
  onSelect: (student: Student) => void;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getCandidateMeta(student: Student) {
  if (student.codigo?.trim()) {
    return `Código ${student.codigo.trim().toUpperCase()}`;
  }
  if (student.colegio?.trim()) {
    return student.colegio.trim();
  }
  if (student.nivel_educativo) {
    return student.nivel_educativo === "primaria" ? "Primaria" : "Secundaria";
  }
  if (student.dni_alumno?.trim() && !/^PEND-/i.test(student.dni_alumno.trim())) {
    return `DNI ${student.dni_alumno.trim()}`;
  }
  return null;
}

export function StudentCandidateList({ candidates, onSelect }: StudentCandidateListProps) {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          gap: tokens.spacing.sm,
        },
        header: {
          gap: tokens.spacing.xs,
          paddingHorizontal: tokens.spacing.xs,
        },
        headerTitle: {
          ...tokens.typography.label,
          color: colors.textTitle,
        },
        headerHint: {
          ...tokens.typography.caption,
          color: colors.textMuted,
          lineHeight: 18,
        },
        list: {
          borderRadius: tokens.radius.lg,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          backgroundColor: colors.surfaceCard,
          overflow: "hidden",
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.md,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.md,
          minHeight: 68,
          backgroundColor: colors.surfaceListItem,
        },
        rowPressed: {
          backgroundColor: colors.primarySoftBg,
        },
        rowDivider: {
          borderBottomWidth: 1,
          borderBottomColor: colors.borderMuted,
        },
        avatar: {
          backgroundColor: colors.primary,
        },
        body: {
          flex: 1,
          gap: 2,
          minWidth: 0,
        },
        name: {
          ...tokens.typography.bodyStrong,
          color: colors.textTitle,
        },
        meta: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        trailing: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.xs,
        },
        chooseLabel: {
          ...tokens.typography.label,
          color: colors.primary,
        },
      }),
    [colors, tokens],
  );

  if (candidates.length <= 1) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {candidates.length} coincidencias encontradas
        </Text>
        <Text style={styles.headerHint}>Toca al alumno correcto para continuar.</Text>
      </View>

      <View style={styles.list}>
        {candidates.map((candidate, index) => {
          const meta = getCandidateMeta(candidate);
          const isLast = index === candidates.length - 1;

          return (
            <Pressable
              key={candidate.id}
              onPress={() => onSelect(candidate)}
              style={({ pressed }) => [
                styles.row,
                !isLast && styles.rowDivider,
                pressed && styles.rowPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Elegir a ${candidate.nombre_alumno}`}
            >
              <Avatar.Text
                size={40}
                label={getInitials(candidate.nombre_alumno)}
                style={styles.avatar}
                labelStyle={{ ...tokens.typography.label, color: colors.textOnPrimary }}
              />
              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={2}>
                  {candidate.nombre_alumno}
                </Text>
                {meta ? (
                  <Text style={styles.meta} numberOfLines={1}>
                    {meta}
                  </Text>
                ) : null}
              </View>
              <View style={styles.trailing}>
                <Text style={styles.chooseLabel}>Elegir</Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={colors.primary}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
