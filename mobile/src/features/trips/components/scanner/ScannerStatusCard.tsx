import { useMemo } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import type { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type ScannerStatusCardProps = {
  icon: IconName;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
};

export function ScannerStatusCard({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  style,
}: ScannerStatusCardProps) {
  const { colors } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flex: 1,
          justifyContent: "center",
          backgroundColor: colors.scannerPanelBg,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: colors.scannerPanelBorder,
        },
        content: {
          alignItems: "center",
          gap: 14,
          paddingVertical: 40,
        },
        title: {
          color: colors.textTitle,
          fontSize: 20,
          fontWeight: "700",
          textAlign: "center",
        },
        body: {
          color: colors.textMuted,
          textAlign: "center",
          lineHeight: 22,
        },
      }),
    [colors],
  );

  return (
    <View style={style}>
      <Card mode="outlined" style={styles.card}>
        <Card.Content style={styles.content}>
          <MaterialCommunityIcons name={icon} size={actionLabel ? 42 : 38} color={actionLabel ? colors.primary : colors.textMuted} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          {actionLabel && onAction ? (
            <Button mode="contained" onPress={onAction}>
              {actionLabel}
            </Button>
          ) : null}
        </Card.Content>
      </Card>
    </View>
  );
}
