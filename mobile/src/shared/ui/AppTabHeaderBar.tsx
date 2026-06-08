import { useMemo } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/src/core/theme/ThemeProvider';
import { ThemeAppearanceControl } from '@/src/shared/ui/ThemeAppearanceControl';

const ESCUDO = require('../../../assets/images/escudo_MDCA.png');

type AppTabHeaderBarProps = {
  onLogout: () => void;
};

export function AppTabHeaderBar({ onLogout }: AppTabHeaderBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          backgroundColor: colors.navHeaderBg,
          paddingTop: insets.top,
        },
        mainRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.md,
          gap: tokens.spacing.md,
        },
        brandBlock: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.spacing.md,
          minWidth: 0,
        },
        escudo: {
          width: 46,
          height: 46,
        },
        brandText: {
          flex: 1,
          gap: 2,
        },
        brandTitle: {
          ...tokens.typography.headline,
          color: colors.navHeaderTitle,
        },
        brandSubtitle: {
          ...tokens.typography.caption,
          color: colors.navHeaderSubtitle,
        },
        actionsBlock: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.spacing.xs,
        },
        iconButton: {
          minWidth: 40,
          minHeight: 40,
          alignItems: 'center',
          justifyContent: 'center',
        },
        accentBar: {
          height: 3,
          backgroundColor: colors.accent,
        },
        separatorBar: {
          height: 1,
          backgroundColor: colors.borderMuted,
        },
      }),
    [colors, insets.top, tokens],
  );

  return (
    <View style={styles.root}>
      <View style={styles.mainRow}>
        <View style={styles.brandBlock}>
          <Image
            source={ESCUDO}
            style={styles.escudo}
            resizeMode="contain"
            accessibilityLabel="Escudo Municipalidad de Cerro Azul"
          />
          <View style={styles.brandText}>
            <Text style={styles.brandTitle} numberOfLines={1}>
              Bus Escolar
            </Text>
            <Text style={styles.brandSubtitle} numberOfLines={1}>
              Cerro Azul
            </Text>
          </View>
        </View>

        <View style={styles.actionsBlock}>
          <ThemeAppearanceControl />
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.iconButton}
            activeOpacity={0.8}
            accessibilityLabel="Abrir perfil"
          >
            <MaterialCommunityIcons name="account-circle-outline" size={24} color={colors.navLogoutIcon} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onLogout}
            style={styles.iconButton}
            activeOpacity={0.8}
            accessibilityLabel="Cerrar sesión"
          >
            <MaterialCommunityIcons name="logout" size={22} color={colors.navLogoutIcon} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.accentBar} />
      <View style={styles.separatorBar} />
    </View>
  );
}
