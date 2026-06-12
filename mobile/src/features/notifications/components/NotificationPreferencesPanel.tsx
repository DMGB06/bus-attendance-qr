import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Switch, Text } from "react-native-paper";

import { useNotificationPreferences } from "@/src/features/notifications/hooks/useNotificationPreferences";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";

export function NotificationPreferencesPanel() {
  const { colors, tokens } = useAppTheme();
  const { items, loading, savingKey, error, togglePreference } = useNotificationPreferences();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          gap: tokens.spacing.sm,
        },
        hint: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: tokens.spacing.md,
          paddingVertical: tokens.spacing.xs,
        },
        label: {
          flex: 1,
          ...tokens.typography.body,
          color: colors.textBody,
        },
        error: {
          ...tokens.typography.caption,
          color: colors.feedbackError,
        },
        loading: {
          paddingVertical: tokens.spacing.sm,
        },
      }),
    [colors, tokens],
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator animating size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        Elige qué eventos del bus quieres recibir como notificación push.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {items.map((item) => (
        <View key={item.eventKey} style={styles.row}>
          <Text style={styles.label}>{item.label}</Text>
          <Switch
            value={item.isEnabled}
            disabled={savingKey === item.eventKey}
            onValueChange={(value) => {
              void togglePreference(item.eventKey, value);
            }}
            color={colors.primary}
          />
        </View>
      ))}
    </View>
  );
}
