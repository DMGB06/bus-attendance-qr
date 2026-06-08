import { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

import { useAppTheme } from '@/src/core/theme/ThemeProvider';

const ESCUDO = require('../../../assets/images/escudo_MDCA.png');

export function AppLoadingScreen() {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.loadingBg,
        },
        navyBand: {
          height: 8,
          backgroundColor: colors.primary,
        },
        accentStripe: {
          height: 4,
          backgroundColor: colors.accent,
        },
        content: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: tokens.spacing.xl,
        },
        escudo: {
          width: 80,
          height: 80,
          marginBottom: tokens.spacing.lg,
        },
      }),
    [colors, tokens.spacing.xl, tokens.spacing.lg],
  );

  return (
    <View style={styles.root}>
      <View style={styles.navyBand} />
      <View style={styles.accentStripe} />
      <View style={styles.content}>
        <Image source={ESCUDO} style={styles.escudo} resizeMode="contain" accessibilityLabel="Escudo municipal" />
        <ActivityIndicator animating size="small" color={colors.primary} />
      </View>
    </View>
  );
}
