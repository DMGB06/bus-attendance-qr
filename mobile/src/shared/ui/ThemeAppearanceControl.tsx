import { useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/src/core/theme/ThemeProvider';

const SPRING = { damping: 18, stiffness: 260, mass: 0.35 };

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

  const knobX = useSharedValue(isDark ? 1 : 0);

  useEffect(() => {
    knobX.value = withSpring(isDark ? 1 : 0, SPRING);
  }, [isDark, knobX]);

  const knobAnimated = useAnimatedStyle(() => ({
    transform: [{ translateX: pad + knobX.value * travel }],
  }));

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
        track: {
          width: trackW,
          height: trackH,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.appearanceControlBg,
          borderWidth: 1,
          borderColor: colors.appearanceControlBorder,
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        },
        trackLarge: {
          width: trackW + 8,
          height: trackH + 4,
        },
        iconsLayer: {
          ...StyleSheet.absoluteFillObject,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 10,
          pointerEvents: 'none',
          zIndex: 1,
        },
        knob: {
          position: 'absolute',
          top: (trackH - knobSize) / 2,
          left: 0,
          width: knobSize,
          height: knobSize,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.appearanceControlKnob,
          borderWidth: 1,
          borderColor: colors.appearanceControlKnobBorder,
          shadowColor: colors.shadowColor,
          shadowOpacity: 0.12,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
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

  const trackStyle = [styles.track, variant === 'panel' && styles.trackLarge];

  const control = (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="Tema de la aplicación"
      accessibilityHint="Alterna entre apariencia clara y oscura"
      accessibilityState={{ checked: isDark }}
      onPress={handlePress}
      style={({ pressed }) => [pressed && { opacity: 0.92 }]}
    >
      <View style={trackStyle}>
        <Animated.View style={[styles.knob, knobAnimated]} />
        <View style={styles.iconsLayer}>
          <MaterialCommunityIcons
            name="white-balance-sunny"
            size={15}
            color={isDark ? colors.appearanceControlIconMuted : colors.appearanceControlIconActive}
          />
          <MaterialCommunityIcons
            name="moon-waning-crescent"
            size={15}
            color={isDark ? colors.appearanceControlIconActive : colors.appearanceControlIconMuted}
          />
        </View>
      </View>
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
