import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCameraPermissions } from "expo-camera";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { Text } from "react-native-paper";

import { StudentConfirmModal } from "@/src/features/trips/components/StudentConfirmModal";
import { ScannerCamera } from "@/src/features/trips/components/scanner/ScannerCamera";
import { ScannerControlPanel } from "@/src/features/trips/components/scanner/ScannerControlPanel";
import { ScannerStatusCard } from "@/src/features/trips/components/scanner/ScannerStatusCard";
import { getScannerAutoModeHint } from "@/src/features/trips/domain/scanner-event.rules";
import { useStudentAttendance, type ScannerViewMode } from "@/src/features/trips/hooks/useStudentAttendance";
import type { Trip } from "@/src/features/trips/types";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { AppScrollView } from "@/src/shared/ui/AppScrollView";
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
  const isFocused = useIsFocused();
  const { colors, tokens } = useAppTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const attendance = useStudentAttendance(activeTrip.id, activeTrip.direction);
  const scannerModeHint = getScannerAutoModeHint(activeTrip.direction);
  const isScannerMode = attendance.viewMode === "scanner";
  const shouldMountCamera =
    isFocused &&
    isScannerMode &&
    !attendance.isSearching &&
    !attendance.isRegistering;
  const cameraScanningEnabled =
    shouldMountCamera && !attendance.isConfirmModalVisible;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: colors.scannerRootBg,
        },
        screenContainer: {
          flex: 1,
          backgroundColor: colors.scannerScreenContainerBg,
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.md,
          paddingBottom: tokens.layout.scrollBottomInset,
          gap: tokens.spacing.md,
        },
        statusContainer: {
          flex: 1,
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.md,
          paddingBottom: tokens.layout.scrollBottomInset,
        },
        statusCard: {
          flex: 1,
        },
        cameraSlot: {
          flex: 1,
          flexBasis: 0,
          minHeight: tokens.layout.cameraMinHeight,
          width: "100%",
        },
        modeBar: {
          flexDirection: "row",
          backgroundColor: colors.surfaceCard,
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.xs,
          gap: tokens.spacing.xs,
          borderWidth: 1,
          borderColor: colors.scannerPanelBorder,
        },
        modeButton: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: tokens.spacing.sm,
          paddingVertical: tokens.spacing.sm,
          borderRadius: tokens.radius.sm,
        },
        modeButtonActive: {
          backgroundColor: colors.primary,
        },
        modeButtonLabel: {
          ...tokens.typography.bodyStrong,
          color: colors.textMuted,
        },
        modeButtonLabelActive: {
          color: colors.textInverse,
        },
        statusPill: {
          alignSelf: "center",
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
          backgroundColor: colors.scannerBadgeBg,
          borderRadius: tokens.radius.full,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.xs,
          borderWidth: 1,
          borderColor: colors.borderHighlight,
        },
        statusPillText: {
          ...tokens.typography.overline,
          color: colors.scannerBadgeText,
        },
        panelScroll: {
          flexGrow: 0,
          flexShrink: 0,
        },
        panelScrollExpanded: {
          flex: 1,
          minHeight: 0,
        },
        panelScrollContent: {
          flexGrow: 0,
        },
        panelScrollContentExpanded: {
          flexGrow: 1,
        },
        panelFill: {
          flexGrow: 1,
        },
        cameraPlaceholder: {
          flex: 1,
          width: "100%",
          minHeight: tokens.layout.cameraMinHeight,
          borderRadius: tokens.radius["2xl"],
          backgroundColor: colors.scannerCameraBg,
          borderWidth: 1,
          borderColor: colors.scannerCameraBorder,
          alignItems: "center",
          justifyContent: "center",
          gap: tokens.spacing.sm,
          padding: tokens.spacing.lg,
        },
        cameraPlaceholderText: {
          ...tokens.typography.body,
          color: colors.textMuted,
          textAlign: "center",
        },
      }),
    [colors, tokens],
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
                  color={isActive ? colors.textInverse : colors.textMuted}
                />
                <Text style={[styles.modeButtonLabel, isActive && styles.modeButtonLabelActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.statusPill}>
          <MaterialCommunityIcons
            name={isScannerMode ? "qrcode-scan" : "account-search"}
            size={tokens.fontSize.sm}
            color={colors.accent}
          />
          <Text style={styles.statusPillText}>
            {isScannerMode ? scannerModeHint : "Búsqueda manual"}
          </Text>
        </View>

        {isScannerMode ? (
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
        ) : null}

        <AppScrollView
          style={isScannerMode ? styles.panelScroll : styles.panelScrollExpanded}
          contentContainerStyle={
            isScannerMode ? styles.panelScrollContent : styles.panelScrollContentExpanded
          }
          contentGrow={!isScannerMode}
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
