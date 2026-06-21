import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { ManualRegister } from "@/src/features/trips/components/ManualRegister";
import { StudentCandidateList } from "@/src/features/trips/components/scanner/StudentCandidateList";
import { isUuid } from "@/src/shared/utils/uuid";
import type { ResolvedScannerEvent } from "@/src/features/trips/domain/scanner-event.rules";
import type { ScannerViewMode } from "@/src/features/trips/hooks/useStudentAttendance";
import type { Student, TripDirection } from "@/src/features/trips/types";

const PANEL_MAX_WIDTH = 520;

function formatScannedLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (isUuid(trimmed)) {
    return "Identificador QR reconocido";
  }
  if (/^BU\d+/i.test(trimmed)) {
    return `Código: ${trimmed.toUpperCase()}`;
  }
  return `Código leído: ${trimmed}`;
}

type ScannerControlPanelProps = {
  viewMode: ScannerViewMode;
  tripDirection: TripDirection;
  resolvedEvent: Extract<ResolvedScannerEvent, { ok: true }> | null;
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

type ScannerPanelIdleInput = Pick<
  ScannerControlPanelProps,
  | "viewMode"
  | "student"
  | "scannedValue"
  | "isSearching"
  | "errorMessage"
  | "infoMessage"
  | "successMessage"
  | "manualCandidates"
>;

export function isScannerControlPanelIdle({
  viewMode,
  student,
  scannedValue,
  isSearching,
  errorMessage,
  infoMessage,
  successMessage,
  manualCandidates,
}: ScannerPanelIdleInput): boolean {
  if (viewMode !== "scanner") {
    return false;
  }

  return (
    !student &&
    !scannedValue.trim() &&
    !isSearching &&
    !errorMessage &&
    !infoMessage &&
    !successMessage &&
    manualCandidates.length === 0
  );
}

export function ScannerControlPanel({
  viewMode,
  tripDirection,
  resolvedEvent,
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
          width: "100%",
          maxWidth: PANEL_MAX_WIDTH,
          alignSelf: "center",
          backgroundColor: colors.surfaceCard,
          borderRadius: tokens.radius.lg,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          borderTopWidth: 4,
          borderTopColor: colors.accent,
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.lg,
          gap: tokens.spacing.md,
        },
        headerBlock: {
          gap: tokens.spacing.xs,
        },
        titleRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
        },
        title: {
          ...tokens.typography.title3,
          color: colors.textTitle,
          flex: 1,
        },
        body: {
          ...tokens.typography.body,
          color: colors.textBody,
          lineHeight: 22,
          paddingRight: tokens.spacing.xs,
        },
        statusRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
          backgroundColor: colors.primarySoftBg,
          borderRadius: tokens.radius.md,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
        },
        statusText: {
          ...tokens.typography.label,
          color: colors.primarySoftText,
          flex: 1,
        },
        selectionBlock: {
          gap: tokens.spacing.md,
          backgroundColor: colors.primarySoftBg,
          borderRadius: tokens.radius.lg,
          padding: tokens.spacing.lg,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
        },
        selectionLabel: {
          ...tokens.typography.bodyStrong,
          color: colors.textTitle,
        },
        selectionMeta: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        errorBlock: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: tokens.spacing.sm,
          backgroundColor: colors.feedbackWarningBg,
          borderRadius: tokens.radius.md,
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
        infoBlock: {
          ...tokens.typography.caption,
          color: colors.textMuted,
          backgroundColor: colors.surfaceTrack,
          borderRadius: tokens.radius.md,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
          lineHeight: 18,
        },
        successBlock: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
          backgroundColor: "rgba(47, 133, 90, 0.1)",
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.md,
          borderWidth: 1,
          borderColor: "rgba(47, 133, 90, 0.2)",
        },
        successText: {
          ...tokens.typography.bodyStrong,
          color: colors.attendanceCompleted,
          flex: 1,
        },
        primaryAction: {
          borderRadius: tokens.radius.md,
        },
        primaryActionContent: {
          height: tokens.layout.buttonHeight - 4,
        },
        secondaryAction: {
          borderRadius: tokens.radius.md,
          borderColor: colors.surfaceCardBorder,
        },
        secondaryActionContent: {
          height: tokens.layout.minTouchTarget,
        },
        secondaryActionLabel: {
          ...tokens.typography.bodyStrong,
          color: colors.primary,
        },
        intentBadge: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
          backgroundColor: colors.primarySoftBg,
          borderRadius: tokens.radius.md,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        intentBadgeText: {
          ...tokens.typography.label,
          color: colors.primarySoftText,
          flex: 1,
        },
        divider: {
          height: 1,
          backgroundColor: colors.borderMuted,
          marginTop: tokens.spacing.xs,
        },
        footerAction: {
          marginTop: tokens.spacing.xs,
        },
      }),
    [colors, tokens],
  );

  const isScannerMode = viewMode === "scanner";
  const scannedLabel = scannedValue ? formatScannedLabel(scannedValue) : null;
  const isScannerIdle = isScannerControlPanelIdle({
    viewMode,
    student,
    scannedValue,
    isSearching,
    errorMessage,
    infoMessage,
    successMessage,
    manualCandidates,
  });

  const resetLabel = isScannerMode
    ? student
      ? "Escanear otro alumno"
      : scannedLabel || errorMessage || successMessage || infoMessage
        ? "Reiniciar escaneo"
        : null
    : student || manualName.trim() || manualCandidates.length > 0
      ? "Limpiar búsqueda"
      : null;

  if (isScannerIdle) {
    return null;
  }

  const showScannerHeader =
    !isScannerMode ||
    Boolean(student) ||
    isSearching ||
    Boolean(manualCandidates.length);

  return (
    <View style={styles.panel}>
      {showScannerHeader ? (
        <View style={styles.headerBlock}>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons
              name={isScannerMode ? "qrcode-scan" : "account-search"}
              size={22}
              color={colors.primary}
            />
            <Text style={styles.title}>
              {isScannerMode ? "Escaneo y confirmación" : "Registro manual"}
            </Text>
          </View>
          <Text style={styles.body}>
            {isScannerMode
              ? "Cada escaneo registra la subida al bus. Si el alumno ya está a bordo, verás un aviso."
              : "Busca por nombre, elige al alumno correcto y confirma el registro."}
          </Text>
        </View>
      ) : null}

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
          {student.colegio ? <Text style={styles.selectionMeta}>{student.colegio}</Text> : null}
          {resolvedEvent ? (
            <View style={styles.intentBadge}>
              <MaterialCommunityIcons
                name={resolvedEvent.intent === "dropoff" ? "home-export-outline" : "bus-side"}
                size={18}
                color={colors.primarySoftText}
              />
              <Text style={styles.intentBadgeText}>{resolvedEvent.confirmTitle}</Text>
            </View>
          ) : null}
          <Button
            mode="contained"
            onPress={onOpenConfirmModal}
            disabled={isRegistering}
            buttonColor={colors.primary}
            style={styles.primaryAction}
            contentStyle={styles.primaryActionContent}
            labelStyle={{ color: colors.textOnPrimary }}
          >
            {resolvedEvent?.confirmLabel ?? "Ver ficha y confirmar"}
          </Button>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorBlock}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.feedbackWarningGlyph} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {infoMessage && manualCandidates.length <= 1 ? (
        <Text style={styles.infoBlock}>{infoMessage}</Text>
      ) : null}

      {successMessage ? (
        <View style={styles.successBlock}>
          <MaterialCommunityIcons name="check-circle-outline" size={20} color={colors.attendanceCompleted} />
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      ) : null}

      {resetLabel ? (
        <>
          <View style={styles.divider} />
          <Button
            mode="outlined"
            icon={isScannerMode ? "refresh" : "broom"}
            onPress={onReset}
            disabled={isSearching || isRegistering}
            style={[styles.secondaryAction, styles.footerAction]}
            contentStyle={styles.secondaryActionContent}
            labelStyle={styles.secondaryActionLabel}
            textColor={colors.primary}
          >
            {resetLabel}
          </Button>
        </>
      ) : null}
    </View>
  );
}
