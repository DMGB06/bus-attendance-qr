import { useCallback, useMemo } from "react";
import { ActivityIndicator, RefreshControl, StyleSheet, View } from "react-native";
import { Avatar, Divider, Surface, Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { logout } from "@/src/features/auth/services/auth.service";
import { useProfile } from "@/src/features/profile/hooks/useProfile";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { AppButton } from "@/src/shared/ui/AppButton";
import { HighContrastToggle } from "@/src/shared/ui/HighContrastToggle";
import { ThemeAppearanceControl } from "@/src/shared/ui/ThemeAppearanceControl";
import { AppScrollView } from "@/src/shared/ui/AppScrollView";

function formatRoleLabel(role: string | null | undefined): string {
  if (!role) {
    return "Sin rol asignado";
  }

  const normalized = role.toLowerCase();
  if (normalized === "chofer") return "Chofer";
  if (normalized === "asistenta") return "Asistenta";
  if (normalized === "padre") return "Padre / madre";
  if (normalized === "coordinador") return "Coordinador";
  if (normalized === "admin") return "Administrador";
  if (normalized === "visor") return "Visor";

  return role;
}

function ProfileField({ label, value }: { label: string; value: string }) {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          gap: tokens.spacing.xs,
          paddingVertical: tokens.spacing.sm,
        },
        label: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        value: {
          ...tokens.typography.bodyStrong,
          color: colors.textTitle,
        },
      }),
    [colors, tokens],
  );

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const profileState = useProfile();
  const { refreshProfile, refreshing } = profileState;

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace("/(auth)/login");
  }, [router]);

  const handleRefresh = useCallback(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: colors.screenSolid,
        },
        content: {
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.md,
          gap: tokens.spacing.lg,
        },
        loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        },
        hero: {
          alignItems: "center",
          paddingVertical: tokens.spacing.sm,
          gap: tokens.spacing.sm,
        },
        avatar: {
          backgroundColor: colors.primary,
        },
        name: {
          ...tokens.typography.title2,
          color: colors.textTitle,
          textAlign: "center",
        },
        rolePill: {
          ...tokens.typography.caption,
          color: colors.primarySoftText,
          backgroundColor: colors.primarySoftBg,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.xs,
          borderRadius: tokens.radius.full,
          overflow: "hidden",
        },
        card: {
          padding: tokens.spacing.lg,
          backgroundColor: colors.surfaceCard,
          borderRadius: tokens.radius.xl,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          gap: tokens.spacing.sm,
        },
        cardTitle: {
          ...tokens.typography.headline,
          color: colors.textTitle,
          marginBottom: tokens.spacing.xs,
        },
        cardHint: {
          ...tokens.typography.caption,
          color: colors.textMuted,
          marginBottom: tokens.spacing.sm,
        },
      }),
    [colors, tokens],
  );

  if (profileState.loading) {
    return (
      <SafeAreaView edges={["bottom", "left", "right"]} style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating size={36} color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const roleLabel = formatRoleLabel(profileState.appRole || profileState.profile?.app_role);
  const phoneLabel = profileState.phone || profileState.profile?.phone || "—";

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={styles.safeArea}>
      <AppScrollView
        contentContainerStyle={styles.content}
        extraBottomInset={tokens.spacing.lg}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.hero}>
          <Avatar.Text
            size={72}
            label={profileState.initials}
            style={styles.avatar}
            color={colors.textOnPrimary}
          />
          <Text style={styles.name}>{profileState.displayName}</Text>
          <Text style={styles.rolePill}>{roleLabel}</Text>
        </View>

        <Surface style={styles.card} elevation={0}>
          <Text style={styles.cardTitle}>Datos del operador</Text>
          <ProfileField label="Correo" value={profileState.email || "—"} />
          <Divider />
          <ProfileField label="Rol" value={roleLabel} />
          <Divider />
          <ProfileField label="Teléfono" value={phoneLabel} />
        </Surface>

        <Surface style={styles.card} elevation={0}>
          <Text style={styles.cardTitle}>Preferencias</Text>
          <Text style={styles.cardHint}>Ajustes de visualización para uso en ruta.</Text>
          <ThemeAppearanceControl variant="panel" />
          <Divider />
          <HighContrastToggle />
        </Surface>

        <AppButton mode="outlined" icon="logout" onPress={() => void handleLogout()}>
          Cerrar sesión
        </AppButton>
      </AppScrollView>
    </SafeAreaView>
  );
}
