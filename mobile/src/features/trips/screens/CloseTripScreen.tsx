import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button, HelperText, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { OPS_ROUTES } from "@/src/core/routes";

import { NoActiveTripView } from "@/src/features/trips/components/NoActiveTripView";
import { CloseTripStudentList } from "@/src/features/trips/components/CloseTripStudentList";
import { CloseTripValidationSkeleton } from "@/src/features/trips/components/CloseTripValidationSkeleton";
import { hasPendingDropoffIssues } from "@/src/features/trips/domain/close-trip-validation";
import {
  getCloseTripOnboardSectionTitle,
  getCloseTripPrioritariosSectionTitle,
  getCloseTripReadyMessage,
  formatTripTitle,
} from "@/src/features/trips/domain/trip-labels";
import { useCloseTrip } from "@/src/features/trips/hooks/useCloseTrip";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { AppButton } from "@/src/shared/ui/AppButton";
import { AppScrollView } from "@/src/shared/ui/AppScrollView";
import { WaveHeader } from "@/src/shared/ui/WaveHeader";
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
          paddingHorizontal: tokens.spacing.lg,
          gap: tokens.spacing.md,
        },
        readyCard: {
          backgroundColor: colors.statusCompletedBg,
          borderRadius: tokens.radius.lg,
          padding: tokens.spacing.md,
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
        },
        readyText: {
          ...tokens.typography.body,
          color: colors.statusCompletedText,
          flex: 1,
        },
        content: {
          gap: tokens.spacing.md,
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
      <WaveHeader
        title="Cerrar viaje"
        subtitle={formatTripTitle(activeTrip)}
        onBack={() => router.back()}
      />
      <AppScrollView
        extraBottomInset={tokens.spacing.lg}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
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
            <MaterialCommunityIcons name="check-circle-outline" size={22} color={colors.statusCompletedText} />
            <Text style={styles.readyText}>{getCloseTripReadyMessage(activeTrip.direction)}</Text>
          </View>
        ) : null}

        <View style={styles.content}>
          {errorMessage ? <HelperText type="error">{errorMessage}</HelperText> : null}

          <AppButton
            onPress={() => void handleCloseTrip()}
            loading={isClosing}
            disabled={isClosing || isLoadingValidation}
            buttonColor={hasOnboardPending ? colors.attendancePending : undefined}
            icon={hasOnboardPending ? "alert-circle-outline" : "check-circle"}
          >
            {hasOnboardPending ? "Finalizar igualmente" : "Finalizar viaje"}
          </AppButton>

          <AppButton
            variant="secondary"
            onPress={() => {
              if (hasOnboardPending || hasPrioritariosPending) {
                router.replace(OPS_ROUTES.roster);
                return;
              }
              router.back();
            }}
            disabled={isClosing}
          >
            {hasOnboardPending || hasPrioritariosPending ? "Ir a la lista" : "Volver"}
          </AppButton>

          {validationError ? (
            <Button mode="text" onPress={() => void reloadValidation()} disabled={isLoadingValidation}>
              Reintentar verificación
            </Button>
          ) : null}
        </View>
      </AppScrollView>
    </SafeAreaView>
  );
}
