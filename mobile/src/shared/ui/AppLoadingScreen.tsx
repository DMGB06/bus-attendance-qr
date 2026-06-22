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
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: tokens.spacing.xl,
        },
        escudo: {
          width: 100,
          height: 100,
          marginBottom: tokens.spacing.lg,
        },
      }),
    [colors.primary, tokens.spacing.lg, tokens.spacing.xl],
  );

  return (
    <View style={styles.root}>
      <Image
        source={ESCUDO}
        style={styles.escudo}
        resizeMode="contain"
        accessibilityLabel="Escudo municipal Cerro Azul"
      />
      <ActivityIndicator animating size="small" color={colors.textOnPrimary} />
    </View>
  );
}
