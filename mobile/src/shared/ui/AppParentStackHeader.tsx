import { useMemo } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";

const ESCUDO = require("../../../assets/images/escudo_MDCA.png");

type AppParentStackHeaderProps = {
  onBack: () => void;
  title?: string;
};

export function AppParentStackHeader({ onBack, title }: AppParentStackHeaderProps) {
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
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.md,
          paddingBottom: tokens.spacing.sm,
          gap: tokens.spacing.md,
        },
        backButton: {
          width: 40,
          height: 40,
          borderRadius: tokens.radius.full,
          alignItems: "center",
          justifyContent: "center",
        },
        brandBlock: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.md,
          minWidth: 0,
        },
        escudoWrap: {
          width: 44,
          height: 44,
          borderRadius: tokens.radius.full,
          alignItems: "center",
          justifyContent: "center",
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
        pageTitle: {
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.md,
          paddingBottom: tokens.spacing.sm,
          ...tokens.typography.title3,
          color: colors.navHeaderTitle,
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
        <Pressable
          onPress={onBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.navHeaderTitle} />
        </Pressable>

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
              Portal apoderados
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.accentBar} />

      {title ? (
        <Text style={styles.pageTitle} numberOfLines={2}>
          {title}
        </Text>
      ) : null}
    </View>
  );
}
