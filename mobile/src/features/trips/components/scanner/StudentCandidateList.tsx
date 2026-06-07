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
          gap: 12,
          backgroundColor: colors.scannerMatchContainerBg,
          borderRadius: 22,
          padding: 12,
        },
        item: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          backgroundColor: colors.scannerMatchItemBg,
          borderRadius: 20,
          padding: 14,
        },
        textBlock: {
          flex: 1,
          gap: 4,
        },
        name: {
          color: colors.textTitle,
          fontSize: tokens.fontSize.lg,
          fontWeight: "700",
        },
        meta: {
          color: colors.textMuted,
          fontSize: tokens.fontSize.md,
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
