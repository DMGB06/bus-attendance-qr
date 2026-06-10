import { memo, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";

type RosterAfternoonBannerProps = {
  prioritariosCount: number;
  prioritariosPreview: string[];
  onPress?: () => void;
};

export const RosterAfternoonBanner = memo(function RosterAfternoonBanner({
  prioritariosCount,
  prioritariosPreview,
  onPress,
}: RosterAfternoonBannerProps) {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        warning: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
          borderRadius: tokens.radius.md,
          backgroundColor: colors.feedbackWarningBg,
          borderWidth: 1,
          borderColor: colors.feedbackWarningBorder,
        },
        warningText: {
          ...tokens.typography.label,
          color: colors.feedbackWarningBody,
          flex: 1,
        },
      }),
    [colors, tokens],
  );

  if (prioritariosCount <= 0) {
    return null;
  }

  const previewLine =
    prioritariosPreview.length > 0 ? prioritariosPreview.join(", ") : null;

  const content = (
    <>
      <MaterialCommunityIcons name="alert-outline" size={18} color={colors.feedbackWarningGlyph} />
      <Text style={styles.warningText} numberOfLines={2}>
        {prioritariosCount} prioritario{prioritariosCount === 1 ? "" : "s"} sin escanear
        {previewLine ? `: ${previewLine}` : ""}
      </Text>
      {onPress ? (
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.feedbackWarningGlyph} />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable style={styles.warning} onPress={onPress} accessibilityRole="button">
        {content}
      </Pressable>
    );
  }

  return <View style={styles.warning}>{content}</View>;
});
