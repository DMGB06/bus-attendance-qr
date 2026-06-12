import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "react-native-paper";

import { OPS_ROUTES } from "@/src/core/routes";
import { useAppCapabilities } from "@/src/features/auth/hooks/useAppCapabilities";
import { WaitingForDriverView } from "@/src/features/trips/components/WaitingForDriverView";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";

export type NoActiveTripContext = "roster" | "scanner" | "close-trip";

const BODY_BY_CONTEXT: Record<NoActiveTripContext, string> = {
  roster: "Inicia un viaje para ver la lista de asistencia.",
  scanner: "Inicia un viaje para habilitar el escáner QR y registrar asistencia.",
  "close-trip": "No hay un viaje en curso para cerrar.",
};

type NoActiveTripViewProps = {
  context: NoActiveTripContext;
};

export function NoActiveTripView({ context }: NoActiveTripViewProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useAppTheme();
  const { capabilities } = useAppCapabilities();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: colors.screenSolid,
        },
        centerFill: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          minHeight: tokens.layout.emptyStateMinHeight,
          paddingHorizontal: tokens.spacing.xl,
          gap: tokens.spacing.sm,
        },
        title: {
          ...tokens.typography.headline,
          color: colors.textTitle,
          textAlign: "center",
        },
        body: {
          ...tokens.typography.body,
          color: colors.textBody,
          textAlign: "center",
        },
        button: {
          marginTop: tokens.spacing.md,
          backgroundColor: colors.primary,
          borderRadius: tokens.radius.md,
          paddingHorizontal: tokens.spacing.xl,
          paddingVertical: tokens.spacing.md,
        },
        buttonText: {
          ...tokens.typography.bodyStrong,
          color: colors.textOnPrimary,
        },
      }),
    [colors, tokens],
  );

  if (capabilities.isAssistant) {
    return <WaitingForDriverView />;
  }

  if (context === "close-trip" && !capabilities.canCloseTrip) {
    return (
      <SafeAreaView
        edges={["bottom", "left", "right"]}
        style={[styles.safeArea, { paddingBottom: insets.bottom + tokens.spacing.lg }]}
      >
        <View style={styles.centerFill}>
          <MaterialCommunityIcons name="lock-outline" size={44} color={colors.textBody} />
          <Text style={styles.title}>Acceso restringido</Text>
          <Text style={styles.body}>Solo el chofer puede cerrar el viaje.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={[styles.safeArea, { paddingBottom: insets.bottom + tokens.spacing.lg }]}
    >
      <View style={styles.centerFill}>
        <MaterialCommunityIcons name="bus-alert" size={44} color={colors.textBody} />
        <Text style={styles.title}>Sin viaje activo</Text>
        <Text style={styles.body}>{BODY_BY_CONTEXT[context]}</Text>
        {capabilities.canStartTrip ? (
          <Pressable
            style={styles.button}
            onPress={() => router.replace(OPS_ROUTES.trip)}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Ir a iniciar viaje</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
