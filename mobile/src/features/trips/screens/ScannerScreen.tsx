import { useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useCameraPermissions } from "expo-camera";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button, Text } from "react-native-paper";

import { StudentConfirmModal } from "@/src/features/trips/components/StudentConfirmModal";
import { ScannerCamera } from "@/src/features/trips/components/scanner/ScannerCamera";
import { ScannerControlPanel } from "@/src/features/trips/components/scanner/ScannerControlPanel";
import { ScannerStatusCard } from "@/src/features/trips/components/scanner/ScannerStatusCard";
import { useStudentAttendance } from "@/src/features/trips/hooks/useStudentAttendance";
import { useTripStore } from "@/src/features/trips/store/tripStore";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { AppScrollView } from "@/src/shared/ui/AppScrollView";

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const { activeTrip } = useTripStore();
  const { height: screenHeight } = useWindowDimensions();
  const { colors, tokens } = useAppTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraHeight = Math.max(
    tokens.layout.cameraMinHeight,
    Math.min(tokens.layout.cameraMaxHeight, screenHeight * tokens.layout.cameraHeightRatio),
  );

  const attendance = useStudentAttendance(activeTrip?.id);

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
          paddingHorizontal: tokens.spacing.xl,
          paddingTop: tokens.spacing.md,
          gap: tokens.spacing.xl,
        },
        panelScroll: {
          flex: 1,
          minHeight: 0,
        },
        panelScrollContent: {
          paddingBottom: tokens.spacing.md,
        },
        panelFill: {
          minHeight: tokens.layout.emptyStateMinHeight,
        },
        badge: {
          alignSelf: "center",
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
          backgroundColor: colors.scannerBadgeBg,
          borderRadius: tokens.radius.full,
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.sm,
        },
        badgeText: {
          ...tokens.typography.overline,
          color: colors.scannerBadgeText,
        },
        toggleRow: {
          flexDirection: "row",
          gap: tokens.spacing.sm,
          alignSelf: "center",
          marginBottom: tokens.spacing.sm,
        },
      }),
    [colors, tokens],
  );

  const containerStyle = [
    styles.screenContainer,
    { paddingBottom: Math.max(insets.bottom, tokens.spacing.md) },
  ];

  if (!activeTrip) {
    return (
      <SafeAreaView edges={["bottom", "left", "right"]} style={containerStyle}>
        <ScannerStatusCard
          icon="lock-outline"
          title="Scanner bloqueado"
          body="Primero debes iniciar un viaje en la pestaña Viaje para habilitar la cámara."
        />
      </SafeAreaView>
    );
  }

  if (!permission) {
    return (
      <View style={containerStyle}>
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
      <View style={containerStyle}>
        <ScannerStatusCard
          icon="camera-off-outline"
          title="Permiso de cámara requerido"
          body="Necesitas permitir el acceso a la cámara para usar el scanner."
          actionLabel="Permitir cámara"
          onAction={requestPermission}
        />
      </View>
    );
  }

  const isScannerMode = attendance.viewMode === "scanner";

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={styles.safeArea}>
      <View style={containerStyle}>
        <View style={styles.badge}>
          <MaterialCommunityIcons
            name={isScannerMode ? "qrcode-scan" : "account-search"}
            size={tokens.fontSize.md}
            color={colors.primary}
          />
          <Text style={styles.badgeText}>
            {isScannerMode ? "ESCANER ACTIVO" : "REGISTRO MANUAL"}
          </Text>
        </View>

        <View style={styles.toggleRow}>
          <Button
            mode={isScannerMode ? "contained" : "outlined"}
            onPress={() => attendance.setViewMode("scanner")}
            disabled={attendance.isRegistering}
          >
            Escáner
          </Button>
          <Button
            mode={!isScannerMode ? "contained" : "outlined"}
            onPress={() => attendance.setViewMode("manual")}
            disabled={attendance.isRegistering}
          >
            Manual
          </Button>
        </View>

        {isScannerMode ? (
          <ScannerCamera
            height={cameraHeight}
            onBarcodeScanned={attendance.handleBarcodeScanned}
          />
        ) : null}

        <AppScrollView
          style={styles.panelScroll}
          contentContainerStyle={styles.panelScrollContent}
          contentGrow={false}
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
          onDismiss={attendance.closeConfirmModal}
          onConfirm={() => {
            void attendance.handleConfirmAttendance();
          }}
        />
      </View>
    </SafeAreaView>
  );
}
