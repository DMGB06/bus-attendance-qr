import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";

type ParentMapEmptyStateProps = {
  title: string;
  message: string;
};

export function ParentMapEmptyState({ title, message }: ParentMapEmptyStateProps) {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: tokens.spacing.xl,
          gap: tokens.spacing.sm,
        },
        title: {
          ...tokens.typography.headline,
          color: colors.textTitle,
          textAlign: "center",
        },
        message: {
          ...tokens.typography.body,
          color: colors.textBody,
          textAlign: "center",
        },
      }),
    [colors, tokens],
  );

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="bus-marker" size={48} color={colors.primary} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}
