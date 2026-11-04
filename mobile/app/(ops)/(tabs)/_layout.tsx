import { Fragment, useMemo } from "react";
import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";

import { useAppCapabilities } from "@/src/features/auth/hooks/useAppCapabilities";
import { TripLocationPublisherSync } from "@/src/features/trips/components/TripLocationPublisherSync";
import { OpsTripHydrationSync } from "@/src/features/trips/components/OpsTripHydrationSync";
import { useActiveTripRoster } from "@/src/features/trips/hooks/useActiveTripRoster";
import { useAttendanceQueueSync } from "@/src/features/trips/hooks/useAttendanceQueueSync";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { useTabBarHeight } from "@/src/core/theme/useScrollBottomPadding";

function ActiveTripRosterSync() {
  useActiveTripRoster();
  useAttendanceQueueSync();
  return null;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const { colors, tokens } = useAppTheme();
  const { capabilities, loading: capabilitiesLoading } = useAppCapabilities();

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

  const showScannerTab = capabilitiesLoading || capabilities.canScan;
  const showRosterTab = capabilitiesLoading || capabilities.canViewRoster;

  return (
    <Fragment>
      <OpsTripHydrationSync />
      <ActiveTripRosterSync />
      <TripLocationPublisherSync />
      <Tabs initialRouteName="trip" screenOptions={screenOptions}>
        <Tabs.Screen
          name="trip"
          options={{
            title: capabilities.isAssistant ? "Viaje activo" : "Iniciar Viaje",
            tabBarLabel: "Viaje",
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="bus-clock" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="scanner"
          options={{
            lazy: true,
            href: showScannerTab ? undefined : null,
            title: "Escanear QR",
            tabBarLabel: "Escanear",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "qrcode-scan" : "qrcode"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="roster"
          options={{
            lazy: true,
            href: showRosterTab ? undefined : null,
            title: "Lista",
            tabBarLabel: "Lista",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "format-list-bulleted" : "format-list-bulleted-square"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            lazy: true,
            title: "Perfil",
            tabBarLabel: "Perfil",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "account-circle" : "account-circle-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen name="close-trip" options={{ href: null, title: "Cerrar viaje" }} />
        <Tabs.Screen name="activity" options={{ href: null, title: "Historial" }} />
      </Tabs>
    </Fragment>
  );
}
