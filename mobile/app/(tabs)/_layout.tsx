import { useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { logout } from '@/src/features/auth/services/auth.service';
import { useAppTheme } from '@/src/core/theme/ThemeProvider';
import { ThemeAppearanceControl } from '@/src/shared/ui/ThemeAppearanceControl';

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerLeft: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.spacing.md,
          paddingLeft: tokens.spacing.lg,
        },
        logoContainer: {
          width: 38,
          height: 38,
          borderRadius: tokens.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.navLogoWrapBg,
          borderWidth: 1,
          borderColor: colors.navLogoWrapBorder,
        },
        headerTitle: {
          ...tokens.typography.title3,
          color: colors.navHeaderTitle,
        },
        headerSubtitle: {
          ...tokens.typography.caption,
          color: colors.navHeaderSubtitle,
          marginTop: 1,
        },
        headerRight: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.spacing.sm,
          marginRight: tokens.spacing.lg,
        },
        logoutPill: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
          minHeight: tokens.layout.appearanceNavbarHeight,
          borderRadius: tokens.radius.lg,
        },
        logoutText: {
          ...tokens.typography.bodyStrong,
          color: colors.navLogoutText,
        },
        tabIconContainer: {
          width: 42,
          height: 42,
          borderRadius: tokens.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
        },

      }),
    [colors, tokens],
  );

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace('/(auth)/login');
  }, [router]);

  const screenOptions = useMemo(
    () => ({
      sceneStyle: {
        backgroundColor: colors.screenSolid,
      },
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: colors.screenSolid,
      },
      headerBackground: () => (
        <LinearGradient colors={colors.headerGradient} style={StyleSheet.absoluteFill} />
      ),
      headerLeft: () => (
        <View style={styles.headerLeft}>

          <MaterialCommunityIcons name="bus" size={25} color={colors.navBusIcon} />

          <View>
            <Text style={styles.headerTitle}>Bus Escolar</Text>
            <Text style={styles.headerSubtitle}>Transporte Inteligente</Text>
          </View>
        </View>
      ),
      headerRight: () => (
        <View style={styles.headerRight}>
          <ThemeAppearanceControl />
          <TouchableOpacity onPress={handleLogout} style={styles.logoutPill} activeOpacity={0.8}>
            <MaterialCommunityIcons name="logout" size={18} color={colors.navLogoutIcon} />
          </TouchableOpacity>
        </View>
      ),
      headerTitle: () => null,
      tabBarHideOnKeyboard: true,
      tabBarActiveTintColor: colors.tabBarActive,
      tabBarInactiveTintColor: colors.tabBarInactive,
      tabBarStyle: {
        position: 'absolute' as const,
        backgroundColor: colors.tabBarBg,
        borderTopWidth: 1,
        borderTopColor: colors.tabBarBorder,
        height: 60 + insets.bottom,
        paddingTop: 6,
        paddingBottom: insets.bottom,
        elevation: 0,
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '700' as const,
        letterSpacing: 0.8,
        marginTop: -2,
      },
      tabBarItemStyle: {
        paddingVertical: 4,
      },
    }),
    [colors, insets.bottom, styles, handleLogout],
  );

  return (
    <Tabs initialRouteName="trip" screenOptions={screenOptions}>
      <Tabs.Screen
        name="trip"
        options={{
          title: 'Iniciar Viaje',
          tabBarLabel: 'VIAJE',
          tabBarIcon: ({ color }) => (
            <View style={[styles.tabIconContainer]}>
              <MaterialCommunityIcons name="bus-clock" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Escanear QR',
          tabBarLabel: 'SCAN',
          tabBarIcon: ({ color }) => (
            <View style={[styles.tabIconContainer]}>
              <MaterialCommunityIcons name="qrcode-scan" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="roster"
        options={{
          title: 'Lista',
          tabBarLabel: 'LISTA',
          tabBarIcon: ({ color }) => (
            <View style={[styles.tabIconContainer]}>
              <MaterialCommunityIcons name="format-list-bulleted" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="close-trip"
        options={{
          href: null,
          title: 'Cerrar viaje',
          tabBarStyle: {
            display: 'none',
          },
        }}
      />
    </Tabs>
  );
}
