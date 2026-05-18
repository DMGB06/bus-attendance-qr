import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '@/src/core/theme/ThemeProvider';
import BusControlLogo from '../../../assets/images/bus_logo.svg';

export function AppLoadingScreen() {
  const { colors } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          backgroundColor: colors.loadingBg,
        },
        glowBlue: {
          position: 'absolute',
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: colors.loadingGlowBlue,
          top: -120,
          right: -100,
        },
        glowPurple: {
          position: 'absolute',
          width: 240,
          height: 240,
          borderRadius: 120,
          backgroundColor: colors.loadingGlowPurple,
          bottom: -40,
          left: -60,
        },
        centerContent: {
          alignItems: 'center',
          paddingHorizontal: 32,
        },
        logoWrapper: {
          marginBottom: 26,
        },
        loaderContainer: {
          flexDirection: 'row',
          marginTop: 30,
          gap: 10,
        },
        dot: {
          width: 8,
          height: 8,
          borderRadius: 999,
          backgroundColor: colors.loadingDot,
          opacity: 0.5,
        },
        dot1: {
          opacity: 1,
        },
        dot2: {
          opacity: 0.7,
        },
        dot3: {
          opacity: 0.4,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={colors.loadingGradient} style={StyleSheet.absoluteFill} />
      <View style={styles.glowBlue} />
      <View style={styles.glowPurple} />
      <View style={styles.centerContent}>
        <View style={styles.logoWrapper}>
          <BusControlLogo width={350} height={350} />
        </View>
        <View style={styles.loaderContainer}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </View>
    </View>
  );
}
