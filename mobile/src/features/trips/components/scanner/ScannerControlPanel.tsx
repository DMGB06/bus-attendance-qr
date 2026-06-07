import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, HelperText, Text } from "react-native-paper";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { ManualRegister } from "@/src/features/trips/components/ManualRegister";
import { StudentCandidateList } from "@/src/features/trips/components/scanner/StudentCandidateList";
import type { ScannerViewMode } from "@/src/features/trips/hooks/useStudentAttendance";
import type { Student } from "@/src/features/trips/types";

type ScannerControlPanelProps = {
  viewMode: ScannerViewMode;
  manualName: string;
  manualCandidates: Student[];
  student: Student | null;
  scannedValue: string;
  isSearching: boolean;
  isRegistering: boolean;
  errorMessage: string | null;
  infoMessage: string | null;
  successMessage: string | null;
  onManualNameChange: (value: string) => void;
  onManualSearch: () => Promise<void>;
  onSelectCandidate: (student: Student) => void;
  onOpenConfirmModal: () => void;
  onReset: () => void;
};

export function ScannerControlPanel({
  viewMode,
  manualName,
  manualCandidates,
  student,
  scannedValue,
  isSearching,
  isRegistering,
  errorMessage,
  infoMessage,
  successMessage,
  onManualNameChange,
  onManualSearch,
  onSelectCandidate,
  onOpenConfirmModal,
  onReset,
}: ScannerControlPanelProps) {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        panel: {
          backgroundColor: colors.scannerPanelBg,
          borderRadius: 15,
          borderWidth: 1,
          borderColor: colors.scannerPanelBorder,
          shadowColor: colors.shadowColor,
          shadowOpacity: 0.2,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 8,
        },
        content: {
          gap: 18,
          paddingVertical: 8,
        },
        title: {
          color: colors.textTitle,
          fontSize: tokens.fontSize.xl,
          fontWeight: "700",
        },
        body: {
          color: colors.textMuted,
          fontSize: tokens.fontSize.lg,
          lineHeight: 22,
        },
        selectionBlock: {
          gap: 12,
          backgroundColor: colors.scannerSelectionBg,
          borderRadius: 20,
          padding: 16,
        },
        selectionLabel: {
          color: colors.scannerSelectionLabel,
          fontSize: tokens.fontSize.lg,
          fontWeight: "600",
        },
        scannedValue: {
          color: colors.scannerSelectionMuted,
          fontSize: tokens.fontSize.md,
        },
        actions: {
          gap: 12,
        },
      }),
    [colors, tokens],
  );

  const isScannerMode = viewMode === "scanner";

  return (
    <Card mode="outlined" style={styles.panel}>
      <Card.Content style={styles.content}>
        <Text style={styles.title}>
          {isScannerMode ? "Escaneo y confirmación" : "Registro manual"}
        </Text>
        <Text style={styles.body}>
          {isScannerMode
            ? "Escanea el QR o busca al alumno por nombre para registrarlo manualmente."
            : "Busca al alumno por nombre y confirma su registro manualmente."}
        </Text>

        {!isScannerMode ? (
          <ManualRegister
            manualName={manualName}
            onManualNameChange={onManualNameChange}
            isSearching={isSearching}
            isRegistering={isRegistering}
            onSearch={onManualSearch}
          />
        ) : null}

        <StudentCandidateList candidates={manualCandidates} onSelect={onSelectCandidate} />

        {student ? (
          <View style={styles.selectionBlock}>
            <Text style={styles.selectionLabel}>Alumno seleccionado: {student.nombre_alumno}</Text>
            <Button mode="contained-tonal" onPress={onOpenConfirmModal} disabled={isRegistering}>
              Ver ficha y confirmar
            </Button>
          </View>
        ) : null}

        {scannedValue ? <Text style={styles.scannedValue}>Valor leído: {scannedValue}</Text> : null}

        {errorMessage ? <HelperText type="error">{errorMessage}</HelperText> : null}
        {infoMessage ? <HelperText type="info">{infoMessage}</HelperText> : null}
        {successMessage ? <HelperText type="info">{successMessage}</HelperText> : null}

        <View style={styles.actions}>
          <Button
            mode="contained-tonal"
            icon={isScannerMode ? "qrcode" : "account-search"}
            onPress={onReset}
            disabled={isSearching || isRegistering}
          >
            {isScannerMode
              ? student
                ? "Limpiar y escanear otro"
                : "Reiniciar escaneo"
              : student
                ? "Limpiar y nuevo registro"
                : "Limpiar búsqueda"}
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}
