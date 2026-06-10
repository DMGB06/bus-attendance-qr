import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Switch, Text } from 'react-native-paper';

import { useAppThemePreferences, useAppThemeVisual } from '@/src/core/theme/ThemeProvider';

export function HighContrastToggle() {
  const { highContrastEnabled, setHighContrastEnabled } = useAppThemePreferences();
  const { colors, tokens, isDark } = useAppThemeVisual();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: tokens.spacing.md,
          minHeight: tokens.layout.minTouchTarget,
          paddingVertical: tokens.spacing.xs,
        },
        copy: {
          flex: 1,
          gap: 2,
        },
        label: {
          ...tokens.typography.label,
          color: colors.textBody,
        },
        hint: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
      }),
    [colors, tokens],
  );

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.label}>Alto contraste (exterior)</Text>
        <Text style={styles.hint}>
          {isDark
            ? 'Disponible en tema claro para uso con sol directo.'
            : 'Texto y bordes más marcados para el parabrisas.'}
        </Text>
      </View>
      <Switch
        value={highContrastEnabled}
        onValueChange={setHighContrastEnabled}
        disabled={isDark}
        color={colors.primary}
      />
    </View>
  );
}
