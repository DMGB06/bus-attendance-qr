import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, HelperText, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { ManualRegister } from "@/src/features/trips/components/ManualRegister";
import { StudentCandidateList } from "@/src/features/trips/components/scanner/StudentCandidateList";
import type { ScannerViewMode } from "@/src/features/trips/hooks/useStudentAttendance";
import type { Student } from "@/src/features/trips/types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatScannedLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (UUID_REGEX.test(trimmed)) {
    return "Identificador QR reconocido";
  }
  if (/^BU\d+/i.test(trimmed)) {
    return `Código: ${trimmed.toUpperCase()}`;
  }
  return `Código leído: ${trimmed}`;
}

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
          borderRadius: tokens.radius.xl,
          borderWidth: 1,
          borderColor: colors.scannerPanelBorder,
          shadowColor: colors.shadowColor,
          shadowOpacity: 0.12,
          shadowRadius: tokens.spacing.lg,
          shadowOffset: { width: 0, height: tokens.spacing.sm },
          elevation: 4,
        },
        content: {
          gap: tokens.spacing.lg,
          paddingVertical: tokens.spacing.md,
        },
        headerBlock: {
          gap: tokens.spacing.sm,
        },
        title: {
          ...tokens.typography.title2,
          color: colors.textTitle,
        },
        body: {
          ...tokens.typography.body,
          color: colors.textMuted,
          lineHeight: 22,
        },
        statusRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
          backgroundColor: colors.scannerSelectionBg,
          borderRadius: tokens.radius.lg,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        statusText: {
          ...tokens.typography.label,
          color: colors.scannerSelectionLabel,
          flex: 1,
        },
        selectionBlock: {
          gap: tokens.spacing.md,
          backgroundColor: colors.scannerSelectionBg,
          borderRadius: tokens.radius.lg,
          padding: tokens.spacing.lg,
          borderWidth: 1,
          borderColor: colors.scannerPanelBorder,
        },
        selectionLabel: {
          ...tokens.typography.headline,
          color: colors.textTitle,
        },
        selectionMeta: {
          ...tokens.typography.body,
          color: colors.textMuted,
        },
        errorBlock: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: tokens.spacing.sm,
          backgroundColor: colors.feedbackWarningBg,
          borderRadius: tokens.radius.lg,
          padding: tokens.spacing.md,
          borderWidth: 1,
          borderColor: colors.feedbackWarningBorder,
        },
        errorText: {
          ...tokens.typography.body,
          color: colors.feedbackWarningBody,
          flex: 1,
          lineHeight: 22,
        },
        successBlock: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
          backgroundColor: colors.scannerSelectionBg,
          borderRadius: tokens.radius.lg,
          padding: tokens.spacing.md,
        },
        successText: {
          ...tokens.typography.bodyStrong,
          color: colors.primary,
          flex: 1,
        },
        actions: {
          gap: tokens.spacing.sm,
          marginTop: tokens.spacing.xs,
        },
        primaryAction: {
          borderRadius: tokens.radius.lg,
        },
      }),
    [colors, tokens],
  );

  const isScannerMode = viewMode === "scanner";
  const scannedLabel = scannedValue ? formatScannedLabel(scannedValue) : null;

  return (
    <Card mode="outlined" style={styles.panel}>
      <Card.Content style={styles.content}>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>
            {isScannerMode ? "Escaneo y confirmación" : "Registro manual"}
          </Text>
          <Text style={styles.body}>
            {isScannerMode
              ? "Apunta al carnet del alumno. Si el QR no responde, usa la pestaña Manual o busca por nombre."
              : "Escribe el nombre del alumno, elige la coincidencia correcta y confirma el registro."}
          </Text>
        </View>

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

        {isSearching ? (
          <View style={styles.statusRow}>
            <MaterialCommunityIcons name="loading" size={18} color={colors.primary} />
            <Text style={styles.statusText}>Consultando padrón oficial…</Text>
          </View>
        ) : null}

        {scannedLabel && !student ? (
          <View style={styles.statusRow}>
            <MaterialCommunityIcons name="qrcode-scan" size={18} color={colors.primary} />
            <Text style={styles.statusText}>{scannedLabel}</Text>
          </View>
        ) : null}

        {student ? (
          <View style={styles.selectionBlock}>
            <Text style={styles.selectionLabel}>{student.nombre_alumno}</Text>
            {student.codigo ? (
              <Text style={styles.selectionMeta}>Código {student.codigo.toUpperCase()}</Text>
            ) : null}
            {student.colegio ? (
              <Text style={styles.selectionMeta}>{student.colegio}</Text>
            ) : null}
            <Button
              mode="contained"
              onPress={onOpenConfirmModal}
              disabled={isRegistering}
              style={styles.primaryAction}
            >
              Ver ficha y confirmar
            </Button>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorBlock}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.feedbackWarningGlyph} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {infoMessage ? <HelperText type="info">{infoMessage}</HelperText> : null}

        {successMessage ? (
          <View style={styles.successBlock}>
            <MaterialCommunityIcons name="check-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            mode="contained-tonal"
            icon={isScannerMode ? "qrcode" : "account-search"}
            onPress={onReset}
            disabled={isSearching || isRegistering}
            style={styles.primaryAction}
          >
            {isScannerMode
              ? student
                ? "Escanear otro alumno"
                : "Reiniciar escaneo"
              : student
                ? "Nueva búsqueda"
                : "Limpiar búsqueda"}
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}
