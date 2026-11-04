import { useMemo } from "react";
import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";

import { ParentChildrenSync } from "@/src/features/parent/components/ParentChildrenSync";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { useTabBarHeight } from "@/src/core/theme/useScrollBottomPadding";

export default function ParentTabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const { colors, tokens } = useAppTheme();

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
      headerShown: false,
      tabBarHideOnKeyboard: true,
      tabBarActiveTintColor: colors.tabBarActive,
      tabBarInactiveTintColor: colors.tabBarInactive,
      tabBarStyle: {
        position: "absolute" as const,
        backgroundColor: colors.tabBarBg,
        borderTopWidth: 1,
        borderTopColor: colors.tabBarBorder,
        height: tabBarHeight,
        paddingTop: tokens.spacing.xs,
        paddingBottom: insets.bottom,
        elevation: 0,
        shadowOpacity: 0,
      },
      tabBarLabelStyle: tabLabelStyle,
      tabBarItemStyle: {
        paddingVertical: tokens.spacing.xs,
        marginBottom: Platform.OS === "web" ? 12 : 0,
      },
    }),
    [colors, insets.bottom, tabBarHeight, tabLabelStyle, tokens],
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
                color={color}
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
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "Historial",
            tabBarLabel: "Historial",
            lazy: true,
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="history" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: "Perfil",
            tabBarLabel: "Perfil",
            lazy: true,
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "account-circle" : "account-circle-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
