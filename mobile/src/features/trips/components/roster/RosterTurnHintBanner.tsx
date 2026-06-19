import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { getTurnLevelHintMessage } from "@/src/features/trips/domain/trip-labels";
import type { TurnType } from "@/src/features/trips/types";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";

type RosterTurnHintBannerProps = {
  turnType: TurnType | null | undefined;
};

export const RosterTurnHintBanner = memo(function RosterTurnHintBanner({
  turnType,
}: RosterTurnHintBannerProps) {
  const { colors, tokens } = useAppTheme();
  const message = getTurnLevelHintMessage(turnType);

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
      }),
    [colors, tokens],
  );

  if (!message) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <MaterialCommunityIcons name="school-outline" size={18} color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
});
