import { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "react-native-paper";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { ThemeAppearanceControl } from "@/src/shared/ui/ThemeAppearanceControl";

export function useAppTabHeader(onLogout: () => void) {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerLeft: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.md,
          paddingLeft: tokens.spacing.lg,
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
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
          marginRight: tokens.spacing.lg,
        },
        profileButton: {
          padding: 8,
          borderRadius: 8,
        },
        logoutPill: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
          minHeight: tokens.layout.appearanceNavbarHeight,
          borderRadius: tokens.radius.lg,
        },
      }),
    [colors, tokens],
  );

  const headerLeft = (
    <View style={styles.headerLeft}>
      <MaterialCommunityIcons name="bus" size={25} color={colors.navBusIcon} />
      <View>
        <Text style={styles.headerTitle}>Bus Escolar</Text>
        <Text style={styles.headerSubtitle}>Transporte Inteligente</Text>
      </View>
    </View>
  );

  const headerRight = (
    <View style={styles.headerRight}>
      <ThemeAppearanceControl />
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/profile")}
        style={styles.profileButton}
        activeOpacity={0.8}
        accessibilityLabel="Abrir perfil"
      >
        <MaterialCommunityIcons name="account-circle" size={20} color={colors.navLogoutIcon} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onLogout} style={styles.logoutPill} activeOpacity={0.8}>
        <MaterialCommunityIcons name="logout" size={18} color={colors.navLogoutIcon} />
      </TouchableOpacity>
    </View>
  );

  return { headerLeft, headerRight };
}
