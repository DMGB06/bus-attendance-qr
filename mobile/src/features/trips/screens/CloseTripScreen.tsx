import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button, Card, HelperText, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { NoActiveTripView } from "@/src/features/trips/components/NoActiveTripView";
import { CloseTripStudentList } from "@/src/features/trips/components/CloseTripStudentList";
import { CloseTripValidationSkeleton } from "@/src/features/trips/components/CloseTripValidationSkeleton";
import { TripHeader } from "@/src/features/trips/components/TripHeader";
import { hasPendingDropoffIssues } from "@/src/features/trips/domain/close-trip-validation";
import {
  getCloseTripOnboardSectionTitle,
  getCloseTripPrioritariosSectionTitle,
  getCloseTripReadyMessage,
  getCloseTripScreenSubtitle,
} from "@/src/features/trips/domain/trip-labels";
import { useCloseTrip } from "@/src/features/trips/hooks/useCloseTrip";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { AppScrollView } from "@/src/shared/ui/AppScrollView";
import { useScreenPerfMark } from "@/src/shared/hooks/useScreenPerfMark";

export default function CloseTripScreen() {
  useScreenPerfMark("close-trip");
  const router = useRouter();
  const {
    activeTrip,
    validation,
    isLoadingValidation,
    validationError,
    isClosing,
    errorMessage,
    reloadValidation,
    handleCloseTrip,
  } = useCloseTrip();
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
        readyCard: {
          backgroundColor: "rgba(47, 133, 90, 0.1)",
          borderRadius: tokens.radius.xl,
          padding: tokens.spacing.md,
          borderWidth: 1,
          borderColor: colors.attendanceCompleted,
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
        },
        readyText: {
          ...tokens.typography.body,
          color: colors.attendanceCompleted,
          flex: 1,
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
        closeButtonDanger: {
          backgroundColor: colors.attendancePending,
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
      }),
    [colors, tokens],
  );

  if (!activeTrip) {
    return <NoActiveTripView context="close-trip" />;
  }

  const hasOnboardPending = hasPendingDropoffIssues(validation);
  const hasPrioritariosPending = validation.missingPrioritarios.length > 0;
  const showReadyState = !isLoadingValidation && !hasOnboardPending && !validationError;

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
          <Text style={styles.subtitle}>{getCloseTripScreenSubtitle(activeTrip.direction)}</Text>
        </View>

        <TripHeader trip={activeTrip} />

        {isLoadingValidation ? <CloseTripValidationSkeleton /> : null}

        {validation.connectivityWarning ? (
          <HelperText type="info">{validation.connectivityWarning}</HelperText>
        ) : null}

        {validationError ? (
          <HelperText type="error">{validationError}</HelperText>
        ) : null}

        {hasOnboardPending ? (
          <CloseTripStudentList
            title={getCloseTripOnboardSectionTitle(
              activeTrip.direction,
              validation.pendingDropoff.length,
            )}
            students={validation.pendingDropoff}
            tone="danger"
          />
        ) : null}

        {activeTrip.direction === "retorno" && hasPrioritariosPending ? (
          <CloseTripStudentList
            title={getCloseTripPrioritariosSectionTitle(validation.missingPrioritarios.length)}
            students={validation.missingPrioritarios}
            tone="warning"
          />
        ) : null}

        {showReadyState ? (
          <View style={styles.readyCard}>
            <MaterialCommunityIcons name="check-circle-outline" size={22} color={colors.attendanceCompleted} />
            <Text style={styles.readyText}>{getCloseTripReadyMessage(activeTrip.direction)}</Text>
          </View>
        ) : null}

        <Card mode="outlined" style={styles.actionCard}>
          <Card.Content style={styles.content}>
            {errorMessage ? <HelperText type="error">{errorMessage}</HelperText> : null}

            <Button
              mode="contained"
              onPress={() => void handleCloseTrip()}
              loading={isClosing}
              disabled={isClosing || isLoadingValidation}
              style={[styles.closeButton, hasOnboardPending && styles.closeButtonDanger]}
              contentStyle={styles.buttonContent}
              labelStyle={styles.closeLabel}
              icon={hasOnboardPending ? "alert-circle-outline" : "check-circle"}
            >
              {hasOnboardPending ? "Finalizar igualmente" : "Finalizar viaje"}
            </Button>

            <Button
              mode="outlined"
              onPress={() => {
                if (hasOnboardPending || hasPrioritariosPending) {
                  router.replace("/(tabs)/roster");
                  return;
                }
                router.back();
              }}
              disabled={isClosing}
              style={styles.backButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.backLabel}
            >
              {hasOnboardPending || hasPrioritariosPending ? "Ir a la lista" : "Volver"}
            </Button>

            {validationError ? (
              <Button mode="text" onPress={() => void reloadValidation()} disabled={isLoadingValidation}>
                Reintentar verificación
              </Button>
            ) : null}
          </Card.Content>
        </Card>
      </AppScrollView>
    </SafeAreaView>
  );
}
