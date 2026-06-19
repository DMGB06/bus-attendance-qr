import { memo, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { getMorningRiderReminderMessage } from "@/src/features/trips/domain/trip-labels";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";

type MorningRiderReminderBannerProps = {
  count: number;
  preview: string[];
  onPress?: () => void;
};

export const MorningRiderReminderBanner = memo(function MorningRiderReminderBanner({
  count,
  preview,
  onPress,
}: MorningRiderReminderBannerProps) {
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

  if (count <= 0) {
    return null;
  }

  const content = (
    <>
      <MaterialCommunityIcons name="alert-outline" size={18} color={colors.feedbackWarningGlyph} />
      <Text style={styles.warningText} numberOfLines={3}>
        {getMorningRiderReminderMessage(count, preview)}
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
