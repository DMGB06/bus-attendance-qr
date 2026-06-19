import { useMemo, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "react-native-paper";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";

type WaitingForDriverViewProps = {
  busLabel?: string | null;
  isRefreshing?: boolean;
  title?: string;
  body?: string;
  footer?: ReactNode;
};

export function WaitingForDriverView({
  busLabel,
  isRefreshing = false,
  title = "Esperando al chofer",
  body = "El chofer debe iniciar el viaje en su celular. Esta pantalla se actualizará sola.",
  footer,
}: WaitingForDriverViewProps) {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: colors.screenSolid,
        },
        center: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: tokens.spacing.xl,
          gap: tokens.spacing.sm,
        },
        title: {
          ...tokens.typography.headline,
          color: colors.textTitle,
          textAlign: "center",
        },
        body: {
          ...tokens.typography.body,
          color: colors.textBody,
          textAlign: "center",
        },
        busHint: {
          ...tokens.typography.caption,
          color: colors.textMuted,
          textAlign: "center",
        },
        footer: {
          paddingHorizontal: tokens.spacing.xl,
          paddingBottom: tokens.spacing.xl,
        },
      }),
    [colors, tokens],
  );

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={styles.safeArea}>
      <View style={styles.center}>
        <MaterialCommunityIcons name="bus-clock" size={48} color={colors.primary} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        {busLabel ? <Text style={styles.busHint}>Unidad: {busLabel}</Text> : null}
        {isRefreshing ? (
          <ActivityIndicator animating size="small" color={colors.primary} style={{ marginTop: 8 }} />
        ) : null}
      </View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}
