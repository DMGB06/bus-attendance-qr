import { useCallback, useMemo } from "react";
import { Tabs, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { logout } from "@/src/features/auth/services/auth.service";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { AppTabHeaderBar } from "@/src/shared/ui/AppTabHeaderBar";

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useAppTheme();

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace("/(auth)/login");
  }, [router]);

  const renderHeader = useCallback(
    () => <AppTabHeaderBar onLogout={handleLogout} />,
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
    <Tabs initialRouteName="trip" screenOptions={screenOptions}>
      <Tabs.Screen
        name="trip"
        options={{
          title: "Iniciar Viaje",
          tabBarLabel: "Viaje",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name="bus-clock"
              size={24}
              color={focused ? colors.tabBarActive : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Escanear QR",
          tabBarLabel: "Escanear",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "qrcode-scan" : "qrcode"}
              size={24}
              color={focused ? colors.tabBarActive : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="roster"
        options={{
          title: "Lista",
          tabBarLabel: "Lista",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "format-list-bulleted" : "format-list-bulleted-square"}
              size={24}
              color={focused ? colors.tabBarActive : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: "Perfil",
        }}
      />
      <Tabs.Screen
        name="close-trip"
        options={{
          href: null,
          title: "Cerrar viaje",
        }}
      />
    </Tabs>
  );
}
