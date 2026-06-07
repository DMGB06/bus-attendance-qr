import { useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Avatar, Divider, Surface, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useProfile } from "@/src/features/profile/hooks/useProfile";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { AppButton } from "@/src/shared/ui/AppButton";

export default function ProfileScreen() {
  const { colors, tokens } = useAppTheme();
  const profileState = useProfile();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.screenSolid,
        },
        content: {
          padding: tokens.spacing.lg,
        },
        loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.screenSolid,
        },
        hero: {
          alignItems: "center",
          marginBottom: tokens.spacing.md,
        },
        avatarRing: {
          width: tokens.layout.avatarProfileSize,
          height: tokens.layout.avatarProfileSize,
          borderRadius: tokens.radius.full,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: tokens.spacing.xs,
          borderColor: colors.primary,
          marginBottom: tokens.spacing.sm,
        },
        avatar: {
          backgroundColor: colors.surfaceCard,
        },
        editPhotoButton: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
        },
        editPhotoLabel: {
          color: colors.primary,
          ...tokens.typography.label,
        },
        title: {
          ...tokens.typography.title2,
          color: colors.textHero,
          marginTop: tokens.spacing.md,
          marginBottom: tokens.spacing.xs,
        },
        subtitle: {
          ...tokens.typography.body,
          color: colors.textSubtitle,
        },
        card: {
          padding: tokens.spacing.md,
          backgroundColor: colors.surfaceCard,
          borderRadius: tokens.radius.lg,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          marginBottom: tokens.spacing.md,
        },
        cardTitle: {
          ...tokens.typography.title3,
          marginBottom: tokens.spacing.sm,
          color: colors.textTitle,
        },
        cardDivider: {
          borderTopWidth: 1,
          borderTopColor: colors.surfaceCardBorder,
        },
        cardBody: {
          paddingVertical: tokens.spacing.md,
        },
        row: {
          flexDirection: "row",
          justifyContent: "space-between",
          paddingVertical: tokens.spacing.sm,
        },
        label: {
          ...tokens.typography.label,
          color: colors.textMuted,
        },
        value: {
          ...tokens.typography.bodyStrong,
          color: colors.textBody,
        },
        spacerMd: {
          height: tokens.spacing.md,
        },
        spacerLg: {
          height: tokens.spacing.lg,
        },
      }),
    [colors, tokens],
  );

  if (profileState.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating size={36} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.avatarRing}>
          <Avatar.Text
            size={tokens.layout.avatarProfileSize - tokens.spacing.lg}
            label={profileState.initials}
            style={styles.avatar}
          />
        </View>

        <TouchableOpacity
          onPress={() => profileState.setEditing(true)}
          style={styles.editPhotoButton}
        >
          <MaterialCommunityIcons name="camera-outline" size={tokens.fontSize.lg} color={colors.primary} />
          <Text style={styles.editPhotoLabel}>Editar foto</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{profileState.displayName}</Text>
        <Text style={styles.subtitle}>
          {profileState.profile?.role ?? "Sin rol"} · {profileState.profile?.area ?? "Sin área"}
        </Text>
      </View>

      <Surface style={styles.card}>
        <Text style={styles.cardTitle}>Mi perfil</Text>
        <View style={styles.cardDivider} />
        <View style={styles.cardBody}>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre</Text>
            <Text style={styles.value}>{profileState.displayName}</Text>
          </View>
          <Divider />
          <View style={styles.row}>
            <Text style={styles.label}>E-mail</Text>
            <Text style={styles.value}>{profileState.email}</Text>
          </View>
          <Divider />
          <View style={styles.row}>
            <Text style={styles.label}>Rol</Text>
            <Text style={styles.value}>{profileState.profile?.role ?? "-"}</Text>
          </View>
        </View>
      </Surface>

      <View style={styles.spacerMd} />

      <Surface style={styles.card}>
        <Text style={styles.cardTitle}>Mi compañía</Text>
        <View style={styles.cardBody}>
          <View style={styles.row}>
            <Text style={styles.label}>Área</Text>
            <Text style={styles.value}>{profileState.profile?.area ?? "-"}</Text>
          </View>
        </View>
      </Surface>

      <View style={styles.spacerLg} />

      {profileState.editing ? (
        <AppButton mode="contained" onPress={() => void profileState.handleSave()} loading={profileState.saving}>
          Guardar cambios
        </AppButton>
      ) : (
        <AppButton onPress={() => profileState.setEditing(true)}>Editar perfil</AppButton>
      )}
    </ScrollView>
  );
}
