import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import type { Student } from "@/src/features/trips/types";

type StudentCandidateListProps = {
  candidates: Student[];
  onSelect: (student: Student) => void;
};

export function StudentCandidateList({ candidates, onSelect }: StudentCandidateListProps) {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          gap: tokens.spacing.md,
          backgroundColor: colors.scannerMatchContainerBg,
          borderRadius: tokens.radius.xl,
          padding: tokens.spacing.md,
        },
        item: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: tokens.spacing.md,
          backgroundColor: colors.scannerMatchItemBg,
          borderRadius: tokens.spacing.xl,
          padding: tokens.spacing.md,
        },
        textBlock: {
          flex: 1,
          gap: tokens.spacing.xs,
        },
        name: {
          ...tokens.typography.headline,
          color: colors.textTitle,
        },
        meta: {
          ...tokens.typography.body,
          color: colors.textMuted,
        },
      }),
    [colors, tokens],
  );

  if (candidates.length <= 1) {
    return null;
  }

  return (
    <View style={styles.container}>
      {candidates.map((candidate) => (
        <View key={candidate.id} style={styles.item}>
          <View style={styles.textBlock}>
            <Text style={styles.name}>{candidate.nombre_alumno}</Text>
            <Text style={styles.meta}>DNI: {candidate.dni_alumno}</Text>
          </View>
          <Button mode="contained-tonal" compact onPress={() => onSelect(candidate)}>
            Elegir
          </Button>
        </View>
      ))}
    </View>
  );
}
