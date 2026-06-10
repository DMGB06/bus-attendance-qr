import { memo, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { NivelEducativo } from "@/src/features/trips/types";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";

type RosterLevelSuggestionBannerProps = {
  suggestedNivel: NivelEducativo;
  visibleCount: number;
  totalCount: number;
  withLevelDataCount: number;
  isActive: boolean;
  onToggle: () => void;
};

const NIVEL_LABEL: Record<NivelEducativo, string> = {
  primaria: "primaria",
  secundaria: "secundaria",
};

export const RosterLevelSuggestionBanner = memo(function RosterLevelSuggestionBanner({
  suggestedNivel,
  visibleCount,
  totalCount,
  withLevelDataCount,
  isActive,
  onToggle,
}: RosterLevelSuggestionBannerProps) {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        banner: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
          borderRadius: tokens.radius.md,
          backgroundColor: colors.primarySoftBg,
          borderWidth: 1,
          borderColor: colors.primarySoftBg,
        },
        text: {
          ...tokens.typography.label,
          color: colors.primarySoftText,
          flex: 1,
        },
        action: {
          ...tokens.typography.caption,
          color: colors.primary,
          fontWeight: "600",
        },
      }),
    [colors, tokens],
  );

  if (withLevelDataCount === 0) {
    return null;
  }

  const nivelLabel = NIVEL_LABEL[suggestedNivel];

  return (
    <Pressable style={styles.banner} onPress={onToggle} accessibilityRole="button">
      <MaterialCommunityIcons name="school-outline" size={18} color={colors.primary} />
      <Text style={styles.text}>
        {isActive
          ? `Sugerido ${nivelLabel}: ${visibleCount} de ${totalCount} alumnos (${withLevelDataCount} con nivel)`
          : `Mostrando todos (${totalCount}). Sugerencia ${nivelLabel} desactivada.`}
      </Text>
      <Text style={styles.action}>{isActive ? "Ver todos" : "Activar"}</Text>
    </Pressable>
  );
});
