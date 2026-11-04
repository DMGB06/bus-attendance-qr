import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/src/core/theme/ThemeProvider';
import { WaveBand } from '@/src/shared/ui/WaveBand';

const ESCUDO = require('../../../assets/images/escudo_MDCA.png');

type WaveHeaderProps = {
  title: string;
  subtitle?: string | null;
  onBack?: () => void;
  right?: ReactNode;
  /** Contadores u otro contenido bajo el titulo. */
  children?: ReactNode;
};

export function WaveHeader({ title, subtitle, onBack, right, children }: WaveHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useAppTheme();

  return (
    <View style={{ backgroundColor: colors.headerBg, paddingTop: insets.top }}>
      <View
        style={[
          styles.row,
          {
            paddingHorizontal: tokens.spacing.lg,
            paddingTop: tokens.spacing.md,
            gap: tokens.spacing.md,
          },
        ]}
      >
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={6}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.onHeader} />
          </Pressable>
        ) : (
          <View style={styles.plate}>
            <Image
              source={ESCUDO}
              style={styles.escudo}
              resizeMode="contain"
              accessibilityLabel="Escudo de Cerro Azul"
            />
          </View>
        )}
        <View style={styles.titles}>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={[tokens.typography.title3, { color: colors.onHeader }]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={2}
              style={[tokens.typography.caption, { color: colors.onHeaderMuted }]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
      {children ? (
        <View style={{ paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.md }}>
          {children}
        </View>
      ) : null}
      <View style={{ marginTop: tokens.spacing.xs }}>
        <WaveBand colors={[colors.waveBack, colors.waveMid, colors.screenSolid]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plate: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  escudo: {
    width: 36,
    height: 36,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    flex: 1,
    minWidth: 0,
  },
});
