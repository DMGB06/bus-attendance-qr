import { useEffect, useMemo } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCameraPermissions } from "expo-camera";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Text } from "react-native-paper";

import { OPS_ROUTES } from "@/src/core/routes";
import { MorningRiderReminderBanner } from "@/src/features/trips/components/MorningRiderReminderBanner";
import { StudentConfirmModal } from "@/src/features/trips/components/StudentConfirmModal";
import { ScannerCamera } from "@/src/features/trips/components/scanner/ScannerCamera";
import { ScannerFeedbackDock } from "@/src/features/trips/components/scanner/ScannerFeedbackDock";
import { ScannerControlPanel } from "@/src/features/trips/components/scanner/ScannerControlPanel";
import { ScannerStatusCard } from "@/src/features/trips/components/scanner/ScannerStatusCard";
import { useStudentAttendance, type ScannerViewMode } from "@/src/features/trips/hooks/useStudentAttendance";
import { useMorningRiderSummary } from "@/src/features/trips/hooks/useMorningRiderSummary";
import { createScannerScreenStyles } from "@/src/features/trips/screens/scannerScreen.styles";
import type { Trip } from "@/src/features/trips/types";
import { useRosterItems, rosterStoreActions } from "@/src/features/trips/store/rosterStore";
import { requestRosterView } from "@/src/features/trips/utils/roster-navigation";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { AppScrollView } from "@/src/shared/ui/AppScrollView";
import { useCompactScreen } from "@/src/shared/hooks/useCompactScreen";
import { useScreenPerfMark } from "@/src/shared/hooks/useScreenPerfMark";

type ModeOption = {
  id: ScannerViewMode;
  label: string;
  icon: "qrcode-scan" | "account-search";
};

const MODE_OPTIONS: ModeOption[] = [
  { id: "scanner", label: "Escáner", icon: "qrcode-scan" },
  { id: "manual", label: "Manual", icon: "account-search" },
];

type ScannerActiveViewProps = {
  activeTrip: Trip;
};

export function ScannerActiveView({ activeTrip }: ScannerActiveViewProps) {
  useScreenPerfMark("scanner");
  const router = useRouter();
  const isFocused = useIsFocused();
  const { colors, tokens } = useAppTheme();
  const { isCompact } = useCompactScreen();
  const [permission, requestPermission] = useCameraPermissions();
  const rosterItems = useRosterItems(activeTrip.id);
  const morningRiders = useMorningRiderSummary(
    activeTrip.trip_date,
    activeTrip.direction,
    rosterItems,
  );

  useEffect(() => {
    if (!isFocused || rosterItems.length > 0) {
      return;
    }

    void rosterStoreActions.hydrateTripRoster(activeTrip.id);
  }, [activeTrip.id, isFocused, rosterItems.length]);

  const attendance = useStudentAttendance(activeTrip.id, activeTrip.direction);
  const isScannerMode = attendance.viewMode === "scanner";
  const shouldMountCamera =
    isFocused &&
    isScannerMode &&
    !attendance.isSearching &&
    !attendance.isRegistering;
  const cameraScanningEnabled =
    shouldMountCamera && !attendance.isConfirmModalVisible;

  const styles = useMemo(
    () => createScannerScreenStyles(colors, tokens, isCompact),
    [colors, isCompact, tokens],
  );

  if (!permission) {
    return (
      <SafeAreaView edges={["bottom", "left", "right"]} style={styles.safeArea}>
        <View style={styles.statusContainer}>
          <ScannerStatusCard
            style={styles.statusCard}
            icon="camera-outline"
            title="Preparando cámara"
            body="Estamos solicitando acceso a la cámara."
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView edges={["bottom", "left", "right"]} style={styles.safeArea}>
        <View style={styles.statusContainer}>
          <ScannerStatusCard
            style={styles.statusCard}
            icon="camera-off-outline"
            title="Permiso de cámara requerido"
            body="Necesitas permitir el acceso a la cámara para usar el escáner."
            actionLabel="Permitir cámara"
            onAction={requestPermission}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={styles.safeArea}>
      <View style={styles.screenContainer}>
        <View style={styles.topChrome}>
          <View style={styles.modeBar}>
            {MODE_OPTIONS.map((option) => {
              const isActive = attendance.viewMode === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.modeButton, isActive && styles.modeButtonActive]}
                  onPress={() => attendance.setViewMode(option.id)}
                  disabled={attendance.isRegistering}
                >
                  <MaterialCommunityIcons
                    name={option.icon}
                    size={tokens.fontSize.md}
                    color={isActive ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.modeButtonLabel, isActive && styles.modeButtonLabelActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {!isScannerMode ? (
            <Text style={styles.modeHint}>Busca por nombre en el padrón oficial.</Text>
          ) : null}

          {morningRiders.isVisible ? (
            <MorningRiderReminderBanner
              count={morningRiders.count}
              preview={morningRiders.preview}
              onPress={() => {
                requestRosterView("prioritarios");
                router.push(OPS_ROUTES.roster);
              }}
            />
          ) : null}
        </View>

        {isScannerMode ? (
          <View style={styles.scannerBody}>
            <View style={styles.cameraSlot}>
              {shouldMountCamera ? (
                <ScannerCamera
                  scanningEnabled={cameraScanningEnabled}
                  onBarcodeScanned={attendance.handleBarcodeScanned}
                />
              ) : (
                <View style={styles.cameraPlaceholder}>
                  <MaterialCommunityIcons
                    name={isFocused ? "camera-outline" : "camera-off-outline"}
                    size={tokens.fontSize.xl}
                    color={colors.textMuted}
                  />
                  <Text style={styles.cameraPlaceholderText}>
                    {!isFocused
                      ? "Cámara pausada — vuelve a la pestaña Escáner para continuar."
                      : "Preparando escaneo…"}
                  </Text>
                </View>
              )}
            </View>

            <AppScrollView
              style={styles.feedbackDock}
              contentContainerStyle={styles.feedbackScrollContent}
              contentGrow={false}
              showsVerticalScrollIndicator={false}
            >
              <ScannerFeedbackDock
                isSearching={attendance.isSearching}
                student={attendance.student}
                errorMessage={attendance.errorMessage}
                successMessage={attendance.successMessage}
                infoMessage={attendance.infoMessage}
                isRegistering={attendance.isRegistering}
                onReset={() => attendance.clearStudentSelection(true)}
              />
            </AppScrollView>
          </View>
        ) : (
          <AppScrollView
            style={styles.manualScroll}
            contentContainerStyle={styles.manualScrollContent}
            contentGrow
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.panelFill}>
              <ScannerControlPanel
                viewMode={attendance.viewMode}
                tripDirection={activeTrip.direction}
                resolvedEvent={attendance.resolvedEvent}
                manualName={attendance.manualName}
                manualCandidates={attendance.manualCandidates}
                student={attendance.student}
                scannedValue={attendance.scannedValue}
                isSearching={attendance.isSearching}
                isRegistering={attendance.isRegistering}
                errorMessage={attendance.errorMessage}
                infoMessage={attendance.infoMessage}
                successMessage={attendance.successMessage}
                onManualNameChange={attendance.handleManualNameChange}
                onManualSearch={attendance.handleManualSearch}
                onSelectCandidate={attendance.handleSelectManualStudent}
                onOpenConfirmModal={attendance.openConfirmModal}
                onReset={() => attendance.clearStudentSelection(true)}
              />
            </View>
          </AppScrollView>
        )}

        <StudentConfirmModal
          visible={attendance.isConfirmModalVisible}
          student={attendance.student}
          isSubmitting={attendance.isRegistering}
          errorMessage={attendance.errorMessage}
          confirmLabel={attendance.resolvedEvent?.confirmLabel}
          subtitle={attendance.resolvedEvent?.confirmSubtitle}
          statusHint={
            attendance.resolvedEvent?.intent === "dropoff"
              ? attendance.resolvedEvent.confirmTitle
              : null
          }
          onDismiss={attendance.cancelStudentConfirmation}
          onConfirm={() => {
            void attendance.handleConfirmAttendance();
          }}
        />
      </View>
    </SafeAreaView>
  );
}
