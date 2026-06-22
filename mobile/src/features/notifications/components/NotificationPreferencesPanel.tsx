import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Switch, Text } from "react-native-paper";

import { useNotificationPreferences } from "@/src/features/notifications/hooks/useNotificationPreferences";
import { getPushSetupStatus } from "@/src/features/notifications/services/push-permissions.service";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";

export function NotificationPreferencesPanel() {
  const { colors, tokens } = useAppTheme();
  const pushSetup = useMemo(() => getPushSetupStatus(), []);
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
        warningBox: {
          gap: tokens.spacing.xs,
          padding: tokens.spacing.sm,
          borderRadius: tokens.radius.md,
          backgroundColor: colors.feedbackWarningBg,
          borderWidth: 1,
          borderColor: colors.feedbackWarningBorder,
        },
        warningTitle: {
          ...tokens.typography.bodyStrong,
          color: colors.feedbackWarningTitle,
        },
        warningHint: {
          ...tokens.typography.caption,
          color: colors.feedbackWarningBody,
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
      {!pushSetup.available ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>{pushSetup.reason}</Text>
          <Text style={styles.warningHint}>{pushSetup.hint}</Text>
        </View>
      ) : (
        <Text style={styles.hint}>
          Elige qué eventos del bus quieres recibir como notificación push.
        </Text>
      )}

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
