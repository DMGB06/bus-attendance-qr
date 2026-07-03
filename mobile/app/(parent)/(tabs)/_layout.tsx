import { useCallback, useMemo } from "react";
import { Tabs, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// 1. IMPORTAMOS PLATFORM
import { Platform } from "react-native";

import { AUTH_ROUTES } from "@/src/core/routes";
import { logout } from "@/src/features/auth/services/auth.service";
import { ParentChildrenSync } from "@/src/features/parent/components/ParentChildrenSync";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { AppParentHeaderBar } from "@/src/shared/ui/AppParentHeaderBar";

export default function ParentTabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useAppTheme();

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace(AUTH_ROUTES.login);
  }, [router]);

  const renderHeader = useCallback(
    () => <AppParentHeaderBar onLogout={handleLogout} />,
    [handleLogout],
  );

  const tabLabelStyle = useMemo(
    () => ({
      ...tokens.typography.label,
      marginTop: 2,
    }),
    [tokens.typography.label],
  );

 const screenOptions = useMemo(
    () => ({
      sceneStyle: {
        backgroundColor: colors.screenSolid,
      },
      headerShadowVisible: false,
      header: renderHeader,
      tabBarHideOnKeyboard: true,
      tabBarActiveTintColor: colors.tabBarActive,
      tabBarInactiveTintColor: colors.tabBarInactive,
      
      // 1. Dejamos el alto de la barra con un espacio extra en web, sin paddingBottom agresivo
      tabBarStyle: {
        position: "absolute" as const,
        backgroundColor: colors.tabBarBg,
        borderTopWidth: 1,
        borderTopColor: colors.tabBarBorder,
        height: Platform.OS === 'web' 
          ? tokens.layout.tabBarBaseHeight + 20 // 20px extra de altura en Web
          : tokens.layout.tabBarBaseHeight + insets.bottom,
        paddingTop: tokens.spacing.xs,
        paddingBottom: insets.bottom,
        elevation: 0,
        shadowOpacity: 0,
      },
      tabBarLabelStyle: tabLabelStyle,
      
      // 2. EMPUJAMOS LOS ITEMS (ICONO + TEXTO) HACIA ARRIBA DESDE SU PROPIO ESTILO
      tabBarItemStyle: {
        paddingVertical: tokens.spacing.xs,
        marginBottom: Platform.OS === 'web' ? 12 : 0, // Esto eleva los iconos y nombres en la Web
      },
    }),
    [colors, insets.bottom, renderHeader, tabLabelStyle, tokens],
  );

  return (
    <>
      <ParentChildrenSync />
      <Tabs initialRouteName="home" screenOptions={screenOptions}>
      <Tabs.Screen
        name="home"
        options={{
          title: "Mis hijos",
          tabBarLabel: "Inicio",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "account-child" : "account-child-outline"}
              size={24}
              color={focused ? colors.tabBarActive : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Ubicación",
          tabBarLabel: "Mapa",
          lazy: true,
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "map" : "map-outline"}
              size={24}
              color={focused ? colors.tabBarActive : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarLabel: "Perfil",
          lazy: true,
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "account-circle" : "account-circle-outline"}
              size={24}
              color={focused ? colors.tabBarActive : color}
            />
          ),
        }}
      />
    </Tabs>
    </>
  );
}