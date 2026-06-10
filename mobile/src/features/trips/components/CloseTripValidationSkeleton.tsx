import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";

export function CloseTripValidationSkeleton() {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surfaceCard,
          borderRadius: tokens.radius.xl,
          padding: tokens.spacing.lg,
          gap: tokens.spacing.md,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
        },
        line: {
          height: 14,
          borderRadius: tokens.radius.sm,
          backgroundColor: colors.borderMuted,
          opacity: 0.55,
        },
        lineShort: {
          width: "55%",
        },
        lineMedium: {
          width: "78%",
        },
        lineFull: {
          width: "100%",
        },
        block: {
          gap: tokens.spacing.sm,
          paddingTop: tokens.spacing.xs,
        },
        rowBlock: {
          gap: tokens.spacing.xs,
          paddingVertical: tokens.spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderMuted,
        },
        caption: {
          ...tokens.typography.body,
          color: colors.textMuted,
          textAlign: "center",
        },
      }),
    [colors, tokens],
  );

  return (
    <View style={styles.card} accessibilityLabel="Verificando alumnos a bordo">
      <View style={[styles.line, styles.lineMedium]} />
      <View style={[styles.line, styles.lineShort]} />

      <View style={styles.block}>
        {[0, 1, 2].map((key) => (
          <View key={key} style={styles.rowBlock}>
            <View style={[styles.line, styles.lineMedium]} />
            <View style={[styles.line, styles.lineShort]} />
          </View>
        ))}
      </View>

      <View style={[styles.line, styles.lineFull, { height: 48, opacity: 0.4 }]} />
      <Text style={styles.caption}>Verificando alumnos a bordo…</Text>
    </View>
  );
}
