import { useMemo } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/src/core/theme/ThemeProvider';
import { OPS_ROUTES } from '@/src/core/routes';
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
          paddingTop: tokens.spacing.md,
          paddingBottom: tokens.spacing.sm,
          gap: tokens.spacing.md,
        },
        brandBlock: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.spacing.md,
          minWidth: 0,
        },
        escudoWrap: {
          width: 44,
          height: 44,
          borderRadius: tokens.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.navLogoWrapBg,
          borderWidth: 1,
          borderColor: colors.navLogoWrapBorder,
        },
        escudo: {
          width: 38,
          height: 38,
        },
        brandText: {
          flex: 1,
          gap: tokens.spacing.xs,
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
          gap: 2,
        },
        iconButton: {
          minWidth: 38,
          minHeight: 38,
          borderRadius: tokens.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
        },
        accentBar: {
          height: 3,
          backgroundColor: colors.accent,
        },
      }),
    [colors, insets.top, tokens],
  );

  return (
    <View style={styles.root}>
      <View style={styles.mainRow}>
        <View style={styles.brandBlock}>
          <View style={styles.escudoWrap}>
            <Image
              source={ESCUDO}
              style={styles.escudo}
              resizeMode="contain"
              accessibilityLabel="Escudo Municipalidad de Cerro Azul"
            />
          </View>

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
            onPress={() => router.push(OPS_ROUTES.profile)}
            style={styles.iconButton}
            activeOpacity={0.75}
            accessibilityLabel="Abrir perfil"
          >
            <MaterialCommunityIcons name="account-circle-outline" size={22} color={colors.navLogoutIcon} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onLogout}
            style={styles.iconButton}
            activeOpacity={0.75}
            accessibilityLabel="Cerrar sesión"
          >
            <MaterialCommunityIcons name="logout" size={20} color={colors.navLogoutIcon} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.accentBar} />
    </View>
  );
}
