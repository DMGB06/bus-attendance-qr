import { useMemo } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCameraPermissions } from "expo-camera";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "react-native-paper";

import { StudentConfirmModal } from "@/src/features/trips/components/StudentConfirmModal";
import { ScannerCamera } from "@/src/features/trips/components/scanner/ScannerCamera";
import { ScannerControlPanel } from "@/src/features/trips/components/scanner/ScannerControlPanel";
import { ScannerStatusCard } from "@/src/features/trips/components/scanner/ScannerStatusCard";
import { useStudentAttendance } from "@/src/features/trips/hooks/useStudentAttendance";
import { useTripStore } from "@/src/features/trips/store/tripStore";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import type { ScannerViewMode } from "@/src/features/trips/hooks/useStudentAttendance";
import { AppScrollView } from "@/src/shared/ui/AppScrollView";

type ModeOption = {
  id: ScannerViewMode;
  label: string;
  icon: "qrcode-scan" | "account-search";
};

const MODE_OPTIONS: ModeOption[] = [
  { id: "scanner", label: "Escáner", icon: "qrcode-scan" },
  { id: "manual", label: "Manual", icon: "account-search" },
];

export default function ScannerScreen() {
  const { activeTrip } = useTripStore();
  const { height: screenHeight } = useWindowDimensions();
  const { colors, tokens } = useAppTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraHeight = Math.max(
    tokens.layout.cameraMinHeight,
    Math.min(tokens.layout.cameraMaxHeight, screenHeight * tokens.layout.cameraHeightRatio),
  );

  const attendance = useStudentAttendance(activeTrip?.id);
  const isScannerMode = attendance.viewMode === "scanner";
  const isCameraScanningEnabled =
    isScannerMode &&
    !attendance.isConfirmModalVisible &&
    !attendance.isSearching &&
    !attendance.isRegistering;

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
          flex: 1,
          minHeight: 0,
        },
        panelScrollContent: {
          flexGrow: 1,
        },
        panelFill: {
          flexGrow: 1,
        },
      }),
    [colors, tokens],
  );

  const statusContainerStyle = [
    styles.screenContainer,
    { paddingBottom: tokens.layout.scrollBottomInset },
  ];

  if (!activeTrip) {
    return (
      <SafeAreaView edges={["left", "right"]} style={statusContainerStyle}>
        <ScannerStatusCard
          icon="lock-outline"
          title="Escáner bloqueado"
          body="Inicia un viaje en la pestaña Viaje para habilitar la cámara."
        />
      </SafeAreaView>
    );
  }

  if (!permission) {
    return (
      <View style={statusContainerStyle}>
        <ScannerStatusCard
          icon="camera-outline"
          title="Preparando cámara"
          body="Estamos solicitando acceso a la cámara."
        />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={statusContainerStyle}>
        <ScannerStatusCard
          icon="camera-off-outline"
          title="Permiso de cámara requerido"
          body="Necesitas permitir el acceso a la cámara para usar el escáner."
          actionLabel="Permitir cámara"
          onAction={requestPermission}
        />
      </View>
    );
  }

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
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
            {isScannerMode ? "Lectura QR activa" : "Búsqueda manual"}
          </Text>
        </View>

        {isScannerMode ? (
          <ScannerCamera
            height={cameraHeight}
            scanningEnabled={isCameraScanningEnabled}
            onBarcodeScanned={attendance.handleBarcodeScanned}
          />
        ) : null}

        <AppScrollView
          style={styles.panelScroll}
          contentContainerStyle={styles.panelScrollContent}
          contentGrow
          omitTabBarInset
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.panelFill}>
            <ScannerControlPanel
              viewMode={attendance.viewMode}
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
          onDismiss={attendance.cancelStudentConfirmation}
          onConfirm={() => {
            void attendance.handleConfirmAttendance();
          }}
        />
      </View>
    </SafeAreaView>
  );
}
