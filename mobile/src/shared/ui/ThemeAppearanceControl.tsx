import { useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/src/core/theme/ThemeProvider';

// compact control: no reanimated spring needed

type ThemeAppearanceControlProps = {
  /** `navbar`: compacto alineado con acciones del header. `panel`: fila con etiqueta para formularios. */
  variant?: 'navbar' | 'panel';
};

export function ThemeAppearanceControl({ variant = 'navbar' }: ThemeAppearanceControlProps) {
  const { isDark, toggleScheme, colors, tokens } = useAppTheme();
  const trackW = tokens.layout.appearanceNavbarWidth;
  const trackH = tokens.layout.appearanceNavbarHeight;
  const knobSize = Math.round(trackH - 8);
  const pad = 4;
  const travel = trackW - knobSize - pad * 2;

  // no animated knob — simple compact icon button

  const styles = useMemo(
    () =>
      StyleSheet.create({
        panelRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: tokens.spacing.md,
          minHeight: tokens.layout.minTouchTarget,
          paddingVertical: tokens.spacing.xs,
        },
        panelLabel: {
          ...tokens.typography.label,
          color: colors.textBody,
          flex: 1,
        },
        // compact circular button styles
        compactButton: {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          borderWidth: 0,
        },
      }),
    [colors, tokens, trackH, trackW, knobSize],
  );

  async function handlePress() {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleScheme();
  }

  const control = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Tema de la aplicación"
      onPress={handlePress}
      style={({ pressed }) => [pressed && { opacity: 0.9 }, styles.compactButton]}
    >
      <MaterialCommunityIcons
        name={isDark ? 'moon-waning-crescent' : 'white-balance-sunny'}
        size={18}
        color={colors.appearanceControlIconActive}
      />
    </Pressable>
  );

  if (variant === 'panel') {
    return (
      <View style={styles.panelRow}>
        <Text style={styles.panelLabel}>Apariencia</Text>
        {control}
      </View>
    );
  }

  return control;
}

/** @deprecated Usa `ThemeAppearanceControl`; se mantiene por compatibilidad con imports antiguos. */
export const ThemeModeIconButton = ThemeAppearanceControl;
