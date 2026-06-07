import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { logout } from "@/src/features/auth/services/auth.service";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { useAppTabHeader } from "@/src/shared/ui/AppTabHeader";

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useAppTheme();

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace("/(auth)/login");
  }, [router]);

  const { headerLeft, headerRight } = useAppTabHeader(handleLogout);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        tabIconContainer: {
          width: 42,
          height: 42,
          borderRadius: tokens.radius.full,
          alignItems: "center",
          justifyContent: "center",
        },
      }),
    [tokens.radius.full],
  );

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
      headerLeft: () => headerLeft,
      headerRight: () => headerRight,
      headerTitle: () => null,
      tabBarHideOnKeyboard: true,
      tabBarActiveTintColor: colors.tabBarActive,
      tabBarInactiveTintColor: colors.tabBarInactive,
      tabBarStyle: {
        position: "absolute" as const,
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
        fontWeight: "700" as const,
        letterSpacing: 0.8,
        marginTop: -2,
      },
      tabBarItemStyle: {
        paddingVertical: 4,
      },
    }),
    [colors, insets.bottom, headerLeft, headerRight],
  );

  return (
    <Tabs initialRouteName="trip" screenOptions={screenOptions}>
      <Tabs.Screen
        name="trip"
        options={{
          title: "Iniciar Viaje",
          tabBarLabel: "VIAJE",
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIconContainer}>
              <MaterialCommunityIcons name="bus-clock" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Escanear QR",
          tabBarLabel: "SCAN",
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIconContainer}>
              <MaterialCommunityIcons name="qrcode-scan" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="roster"
        options={{
          title: "Lista",
          tabBarLabel: "LISTA",
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIconContainer}>
              <MaterialCommunityIcons name="format-list-bulleted" size={22} color={color} />
            </View>
          ),
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
