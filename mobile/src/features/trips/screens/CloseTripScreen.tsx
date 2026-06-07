import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button, Card, HelperText, Surface, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { TripHeader } from "@/src/features/trips/components/TripHeader";
import { useCloseTrip } from "@/src/features/trips/hooks/useCloseTrip";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { AppScrollView } from "@/src/shared/ui/AppScrollView";

export default function CloseTripScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeTrip, isClosing, errorMessage, handleCloseTrip } = useCloseTrip();
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: colors.screenSolid,
        },
        container: {
          paddingHorizontal: tokens.spacing.xl,
          paddingTop: tokens.radius.lg,
          gap: tokens.radius.lg,
        },
        header: {
          alignItems: "center",
          gap: tokens.spacing.sm,
          marginBottom: tokens.spacing.xs,
        },
        iconBox: {
          width: tokens.layout.iconLg,
          height: tokens.layout.iconLg,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.primaryPressed,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.primaryPressed,
          shadowOpacity: 0.35,
          shadowRadius: tokens.radius.lg,
          shadowOffset: { width: 0, height: tokens.spacing.sm },
          elevation: 8,
        },
        title: {
          ...tokens.typography.title1,
          color: colors.textTitle,
          textAlign: "center",
        },
        subtitle: {
          ...tokens.typography.body,
          color: colors.textMuted,
          textAlign: "center",
          paddingHorizontal: tokens.spacing.sm,
        },
        warningCard: {
          backgroundColor: colors.feedbackWarningBg,
          borderRadius: tokens.radius["2xl"],
          padding: tokens.radius.lg,
          borderWidth: 1,
          borderColor: colors.feedbackWarningBorder,
          gap: tokens.spacing.md,
        },
        warningTop: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.md,
        },
        warningIcon: {
          width: tokens.layout.iconSm,
          height: tokens.layout.iconSm,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.feedbackWarningIconCircle,
          alignItems: "center",
          justifyContent: "center",
        },
        warningTitle: {
          ...tokens.typography.headline,
          color: colors.feedbackWarningTitle,
        },
        warningBody: {
          ...tokens.typography.body,
          color: colors.feedbackWarningBody,
        },
        actionCard: {
          backgroundColor: colors.surfaceCard,
          borderRadius: tokens.radius["2xl"],
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          overflow: "hidden",
        },
        content: {
          gap: tokens.spacing.md,
        },
        closeButton: {
          borderRadius: tokens.radius.lg,
          backgroundColor: colors.primaryPressed,
        },
        backButton: {
          borderRadius: tokens.radius.lg,
          borderColor: colors.borderMuted,
        },
        buttonContent: {
          height: tokens.layout.buttonHeight,
        },
        closeLabel: {
          ...tokens.typography.bodyStrong,
          color: colors.textOnPrimary,
        },
        backLabel: {
          ...tokens.typography.bodyStrong,
          color: colors.textBody,
        },
        emptyContainer: {
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: tokens.spacing.xl,
        },
        emptyCard: {
          backgroundColor: colors.surfaceCard,
          borderRadius: tokens.radius["2xl"],
          padding: tokens.radius["2xl"],
          alignItems: "center",
          gap: tokens.spacing.lg,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
        },
        emptyTitle: {
          ...tokens.typography.title2,
          color: colors.textTitle,
        },
        emptyBody: {
          ...tokens.typography.body,
          color: colors.textMuted,
          textAlign: "center",
        },
        homeButton: {
          marginTop: tokens.spacing.sm,
          borderRadius: tokens.radius.lg,
          backgroundColor: colors.primaryPressed,
          width: "100%",
        },
      }),
    [colors, tokens],
  );

  if (!activeTrip) {
    return (
      <SafeAreaView edges={["bottom", "left", "right"]} style={styles.safeArea}>
        <View style={[styles.emptyContainer, { paddingBottom: insets.bottom + tokens.radius.lg }]}>
          <Surface style={styles.emptyCard}>
            <MaterialCommunityIcons name="bus-stop" size={tokens.layout.iconEmptyState} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Sin viaje activo</Text>
            <Text style={styles.emptyBody}>No existe un viaje en curso para cerrar.</Text>
            <Button
              mode="contained"
              onPress={() => router.replace("/(tabs)/trip")}
              style={styles.homeButton}
              contentStyle={styles.buttonContent}
            >
              Ir al inicio
            </Button>
          </Surface>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={styles.safeArea}>
      <AppScrollView
        extraBottomInset={tokens.spacing.lg}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons name="bus-alert" size={tokens.fontSize["3xl"]} color={colors.primaryIconContrast} />
          </View>
          <Text style={styles.title}>Cerrar viaje</Text>
          <Text style={styles.subtitle}>
            Revisa toda la información antes de finalizar el recorrido.
          </Text>
        </View>

        <TripHeader trip={activeTrip} />

        <Surface style={styles.warningCard}>
          <View style={styles.warningTop}>
            <View style={styles.warningIcon}>
              <MaterialCommunityIcons name="alert-outline" size={tokens.fontSize.lg} color={colors.feedbackWarningGlyph} />
            </View>
            <Text style={styles.warningTitle}>Validación previa</Text>
          </View>
          <Text style={styles.warningBody}>
            El sistema verificará alumnos con abordo pendiente antes de permitir cerrar el viaje.
          </Text>
        </Surface>

        <Card mode="outlined" style={styles.actionCard}>
          <Card.Content style={styles.content}>
            {errorMessage ? <HelperText type="error">{errorMessage}</HelperText> : null}

            <Button
              mode="contained"
              onPress={() => void handleCloseTrip()}
              loading={isClosing}
              disabled={isClosing}
              style={styles.closeButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.closeLabel}
              icon="check-circle"
            >
              Finalizar viaje
            </Button>

            <Button
              mode="outlined"
              onPress={() => router.back()}
              disabled={isClosing}
              style={styles.backButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.backLabel}
            >
              Volver
            </Button>
          </Card.Content>
        </Card>
      </AppScrollView>
    </SafeAreaView>
  );
}
