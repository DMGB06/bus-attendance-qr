import { useCallback, useMemo } from "react";
import { Tabs, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
      tabBarStyle: {
        position: "absolute" as const,
        backgroundColor: colors.tabBarBg,
        borderTopWidth: 1,
        borderTopColor: colors.tabBarBorder,
        height: tokens.layout.tabBarBaseHeight + insets.bottom,
        paddingTop: tokens.spacing.xs,
        paddingBottom: insets.bottom,
        elevation: 0,
        shadowOpacity: 0,
      },
      tabBarLabelStyle: tabLabelStyle,
      tabBarItemStyle: {
        paddingVertical: tokens.spacing.xs,
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
