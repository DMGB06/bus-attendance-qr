import { useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, HelperText, Text, TextInput } from 'react-native-paper';
import { StudentConfirmModal } from '@/src/features/trips/components/StudentConfirmModal';
import { ManualRegister } from '@/src/features/trips/components/ManualRegister';
import { registerAttendance } from '@/src/features/trips/services/attendance.service';
import {
  findStudentByCode,
  searchStudentsByName,
} from '@/src/features/trips/services/students.service';
import { useTripStore } from '@/src/features/trips/store/tripStore';
import { useAppTheme } from '@/src/core/theme/ThemeProvider';
import { AppScrollView } from '@/src/shared/ui/AppScrollView';
import type { Student } from '@/src/features/trips/types';

type LookupState = 'idle' | 'searching' | 'found' | 'not_found';

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const { activeTrip } = useTripStore();
  const { height: screenHeight } = useWindowDimensions();
  const { colors, tokens } = useAppTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const isSearching = lookupState === 'searching';
  const [scannedValue, setScannedValue] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualCandidates, setManualCandidates] = useState<Student[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const scanLockedRef = useRef(false);
  const lastScannedRef = useRef<{ value: string; at: number } | null>(null);
  const [viewMode, setViewMode] = useState<'scanner' | 'manual'>('scanner');
  const cameraHeight = Math.max(220, Math.min(360, screenHeight * 0.34));

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
          paddingHorizontal: 20,
          paddingTop: 14,
          gap: 20,
        },
        panelScroll: {
          flex: 1,
          minHeight: 0,
        },
        panelScrollContent: {
          paddingBottom: 14,
        },
        panelFill: {
          minHeight: 120,
        },
        badge: {
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: colors.scannerBadgeBg,
          borderRadius: 999,
          paddingHorizontal: 16,
          paddingVertical: 10,
        },
        badgeText: {
          color: colors.scannerBadgeText,
          fontSize: tokens.fontSize.sm,
          fontWeight: '700',
          letterSpacing: 1.1,
        },
        cameraFrame: {
          borderRadius: 32,
          overflow: 'hidden',
          backgroundColor: colors.scannerCameraBg,
          borderWidth: 1,
          borderColor: colors.scannerCameraBorder,
          position: 'relative',
          shadowColor: colors.scannerCameraShadow,
          shadowOpacity: 0.18,
          shadowRadius: 30,
          shadowOffset: { width: 0, height: 12 },
          elevation: 10,
        },
        camera: {
          flex: 1,
        },
        overlay: {
          ...StyleSheet.absoluteFillObject,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.scannerOverlay,
        },
        corner: {
          position: 'absolute',
          width: 34,
          height: 34,
          borderColor: colors.scannerCorner,
          borderWidth: 3,
        },
        topLeft: {
          top: 24,
          left: 24,
          borderRightWidth: 0,
          borderBottomWidth: 0,
        },
        topRight: {
          top: 24,
          right: 24,
          borderLeftWidth: 0,
          borderBottomWidth: 0,
        },
        bottomLeft: {
          bottom: 24,
          left: 24,
          borderRightWidth: 0,
          borderTopWidth: 0,
        },
        bottomRight: {
          bottom: 24,
          right: 24,
          borderLeftWidth: 0,
          borderTopWidth: 0,
        },
        scanLine: {
          width: '82%',
          height: 4,
          borderRadius: 999,
          backgroundColor: colors.scannerScanLine,
          opacity: 0.95,
        },
        overlayHint: {
          position: 'absolute',
          bottom: 22,
          color: colors.scannerHintText,
          fontSize: tokens.fontSize.sm,
          fontWeight: '600',
          backgroundColor: colors.scannerHintPillBg,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 999,
          overflow: 'hidden',
        },
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
        panelContent: {
          gap: 18,
          paddingVertical: 8,
        },
        panelTitle: {
          color: colors.textTitle,
          fontSize: tokens.fontSize.xl,
          fontWeight: '700',
        },
        panelBody: {
          color: colors.textMuted,
          fontSize: tokens.fontSize.lg,
          lineHeight: 22,
        },
        manualBlock: {
          gap: 14,
        },
        matchesBlock: {
          gap: 12,
          backgroundColor: colors.scannerMatchContainerBg,
          borderRadius: 22,
          padding: 12,
        },
        matchItem: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          backgroundColor: colors.scannerMatchItemBg,
          borderRadius: 20,
          padding: 14,
        },
        matchTextBlock: {
          flex: 1,
          gap: 4,
        },
        matchName: {
          color: colors.textTitle,
          fontSize: tokens.fontSize.lg,
          fontWeight: '700',
        },
        matchMeta: {
          color: colors.textMuted,
          fontSize: tokens.fontSize.md,
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
          fontWeight: '600',
        },
        scannedValue: {
          color: colors.scannerSelectionMuted,
          fontSize: tokens.fontSize.md,
        },
        actions: {
          gap: 12,
        },
        blockedCard: {
          flex: 1,
          justifyContent: 'center',
          backgroundColor: colors.scannerPanelBg,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: colors.scannerPanelBorder,
        },
        blockedContent: {
          alignItems: 'center',
          gap: 14,
          paddingVertical: 40,
        },
        blockedTitle: {
          color: colors.textTitle,
          fontSize: tokens.fontSize.xl,
          fontWeight: '700',
          textAlign: 'center',
        },
        blockedBody: {
          color: colors.textMuted,
          textAlign: 'center',
          lineHeight: 22,
        },
        permissionCard: {
          flex: 1,
          justifyContent: 'center',
          backgroundColor: colors.scannerPanelBg,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: colors.scannerPanelBorder,
        },
        permissionContent: {
          alignItems: 'center',
          gap: 14,
          paddingVertical: 40,
        },
        toggleRow: {
          flexDirection: 'row',
          gap: 8,
          alignSelf: 'center',
          marginBottom: 8,
        },
        permissionTitle: {
          color: colors.textTitle,
          fontSize: tokens.fontSize.xl,
          fontWeight: '700',
          textAlign: 'center',
        },
        permissionBody: {
          color: colors.textMuted,
          textAlign: 'center',
          lineHeight: 22,
        },
      }),
    [colors, tokens],
  );

  const containerStyle = [styles.screenContainer, { paddingBottom: Math.max(insets.bottom, tokens.spacing.md) }];

  async function resolveStudentByCode(value: string) {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      setErrorMessage('Ingresa un código válido.');
      return;
    }

    setLookupState('searching');
    setErrorMessage(null);
    setSuccessMessage(null);
    setInfoMessage(null);
    setStudent(null);
    setManualCandidates([]);
    setScannedValue(normalizedValue);

    try {
      const foundStudent = await findStudentByCode(normalizedValue);

      if (!foundStudent) {
        setLookupState('not_found');
        setIsConfirmModalVisible(false);
        setErrorMessage('Alumno no encontrado');
        scanLockedRef.current = false;
        // evitar volver a procesar inmediatamente el mismo QR
        lastScannedRef.current = { value: normalizedValue, at: Date.now() };
        return;
      }

      setStudent(foundStudent);
      setLookupState('found');
      setIsConfirmModalVisible(true);
    } catch (error: unknown) {
      setLookupState('idle');
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo buscar al alumno.');
      scanLockedRef.current = false;
    }
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    if (viewMode !== 'scanner') return;

    if (scanLockedRef.current || isSearching || isRegistering || student) {
      return;
    }

    const now = Date.now();
    if (lastScannedRef.current?.value === data && now - lastScannedRef.current.at < 800) {
      return;
    }

    lastScannedRef.current = { value: data, at: now };
    scanLockedRef.current = true;
    void resolveStudentByCode(data);
  }

  function clearStudentSelection(clearManualName: boolean) {
    scanLockedRef.current = false;
    setLookupState('idle');
    setScannedValue('');
    setStudent(null);
    setManualCandidates([]);
    setIsConfirmModalVisible(false);
    setErrorMessage(null);
    setInfoMessage(null);

    if (clearManualName) {
      setManualName('');
      setSuccessMessage(null);
    }
  }

  function handleResetScanner() {
    clearStudentSelection(true);
  }

  async function handleManualSearch() {
    if (isSearching || isRegistering) {
      return;
    }

    const normalizedName = manualName.trim();
    if (!normalizedName) {
      setErrorMessage('Ingresa el nombre del alumno.');
      return;
    }

    setLookupState('searching');
    setErrorMessage(null);
    setSuccessMessage(null);
    setInfoMessage(null);
    setStudent(null);
    setManualCandidates([]);
    setScannedValue('');
    scanLockedRef.current = true;

    try {
      const candidates = await searchStudentsByName(normalizedName);

      if (!candidates.length) {
        setLookupState('not_found');
        setErrorMessage('Alumno no encontrado');
        scanLockedRef.current = false;
        return;
      }

      if (candidates.length === 1) {
        setStudent(candidates[0]);
        setLookupState('found');
        setIsConfirmModalVisible(true);
        return;
      }

      setLookupState('idle');
      setManualCandidates(candidates);
      setInfoMessage(`Se encontraron ${candidates.length} alumnos. Selecciona uno.`);
      scanLockedRef.current = false;
    } catch (error: unknown) {
      setLookupState('idle');
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo buscar al alumno.');
      scanLockedRef.current = false;
    }
  }

  function handleSelectManualStudent(selectedStudent: Student) {
    setErrorMessage(null);
    setInfoMessage(null);
    setManualCandidates([]);
    setStudent(selectedStudent);
    setLookupState('found');
    setIsConfirmModalVisible(true);
    scanLockedRef.current = true;
  }

  async function handleConfirmAttendance() {
    if (!activeTrip || !student) {
      return;
    }

    setIsRegistering(true);
    setErrorMessage(null);

    try {
      const studentName = student.nombre_alumno;
      await registerAttendance(activeTrip.id, student.id, 'subio');
      clearStudentSelection(true);
      setSuccessMessage(`Asistencia registrada para ${studentName}.`);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo registrar la asistencia.');
      // Asegurar que el scanner se libere ante errores
      scanLockedRef.current = false;
    } finally {
      setIsRegistering(false);
      // Garantizar liberación del lock al finalizar
      scanLockedRef.current = false;
    }
  }

  function handleCloseConfirmModal() {
    setIsConfirmModalVisible(false);
  }

  if (!activeTrip) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={containerStyle}>
        <Card mode="outlined" style={styles.blockedCard}>
          <Card.Content style={styles.blockedContent}>
            <MaterialCommunityIcons name="lock-outline" size={38} color={colors.textMuted} />
            <Text style={styles.blockedTitle}>Scanner bloqueado</Text>
            <Text style={styles.blockedBody}>
              Primero debes iniciar un viaje en la pestaña Viaje para habilitar la cámara.
            </Text>
          </Card.Content>
        </Card>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return (
      <View style={containerStyle}>
        <Card mode="outlined" style={styles.blockedCard}>
          <Card.Content style={styles.blockedContent}>
            <MaterialCommunityIcons name="camera-outline" size={38} color={colors.textMuted} />
            <Text style={styles.blockedTitle}>Preparando cámara</Text>
            <Text style={styles.blockedBody}>Estamos solicitando acceso a la cámara.</Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={containerStyle}>
        <Card mode="outlined" style={styles.permissionCard}>
          <Card.Content style={styles.permissionContent}>
            <MaterialCommunityIcons name="camera-off-outline" size={42} color={colors.primary} />
            <Text style={styles.permissionTitle}>Permiso de cámara requerido</Text>
            <Text style={styles.permissionBody}>
              Necesitas permitir el acceso a la cámara para usar el scanner.
            </Text>
            <Button mode="contained" onPress={requestPermission}>
              Permitir cámara
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>
      <View style={containerStyle}>
        <View style={styles.badge}>
          <MaterialCommunityIcons
            name={viewMode === 'scanner' ? 'qrcode-scan' : 'account-search'}
            size={16}
            color={colors.primary}
          />
          <Text style={styles.badgeText}>{viewMode === 'scanner' ? 'ESCANER ACTIVO' : 'REGISTRO MANUAL'}</Text>
        </View>

        <View style={styles.toggleRow}>
          <Button
            mode={viewMode === 'scanner' ? 'contained' : 'outlined'}
            onPress={() => setViewMode('scanner')}
            disabled={isRegistering}
          >
            Escáner
          </Button>
          <Button
            mode={viewMode === 'manual' ? 'contained' : 'outlined'}
            onPress={() => setViewMode('manual')}
            disabled={isRegistering}
          >
            Manual
          </Button>
        </View>

        {viewMode === 'scanner' ? (
          <View style={[styles.cameraFrame, { height: cameraHeight }]}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarcodeScanned}
            />
            <View style={styles.overlay} pointerEvents="none">
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              <View style={styles.scanLine} />
              <Text style={styles.overlayHint}>Apunta el QR dentro del marco</Text>
            </View>
          </View>
        ) : null}
        <AppScrollView
          style={styles.panelScroll}
          contentContainerStyle={styles.panelScrollContent}
          contentGrow={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.panelFill}>
            <Card mode="outlined" style={styles.panel}>
              <Card.Content style={styles.panelContent}>
                <Text style={styles.panelTitle}>{viewMode === 'scanner' ? 'Escaneo y confirmación' : 'Registro manual'}</Text>
                <Text style={styles.panelBody}>
                  {viewMode === 'scanner'
                    ? 'Escanea el QR o busca al alumno por nombre para registrarlo manualmente.'
                    : 'Busca al alumno por nombre y confirma su registro manualmente.'}
                </Text>

                {viewMode === 'manual' ? (
                  <ManualRegister
                    manualName={manualName}
                    setManualName={(v) => {
                      setManualName(v);
                      setErrorMessage(null);
                      setInfoMessage(null);
                    }}
                    manualCandidates={manualCandidates}
                    isSearching={isSearching}
                    isRegistering={isRegistering}
                    errorMessage={errorMessage}
                    infoMessage={infoMessage}
                    onSearch={handleManualSearch}
                    onSelectCandidate={handleSelectManualStudent}
                  />
                ) : null}

                {manualCandidates.length > 1 ? (
                  <View style={styles.matchesBlock}>
                    {manualCandidates.map((candidate) => (
                      <View key={candidate.id} style={styles.matchItem}>
                        <View style={styles.matchTextBlock}>
                          <Text style={styles.matchName}>{candidate.nombre_alumno}</Text>
                          <Text style={styles.matchMeta}>
                            DNI: {candidate.dni_alumno}
                          </Text>
                        </View>
                        <Button mode="contained-tonal" compact onPress={() => handleSelectManualStudent(candidate)}>
                          Elegir
                        </Button>
                      </View>
                    ))}
                  </View>
                ) : null}

                {student ? (
                  <View style={styles.selectionBlock}>
                    <Text style={styles.selectionLabel}>Alumno seleccionado: {student.nombre_alumno}</Text>
                    <Button mode="contained-tonal" onPress={() => setIsConfirmModalVisible(true)} disabled={isRegistering}>
                      Ver ficha y confirmar
                    </Button>
                  </View>
                ) : null}

                {scannedValue ? (
                  <Text style={styles.scannedValue}>Valor leído: {scannedValue}</Text>
                ) : null}

                {errorMessage ? <HelperText type="error">{errorMessage}</HelperText> : null}
                {infoMessage ? <HelperText type="info">{infoMessage}</HelperText> : null}
                {successMessage ? <HelperText type="info">{successMessage}</HelperText> : null}

                <View style={styles.actions}>
                  <Button
                    mode="contained-tonal"
                    icon={viewMode === 'scanner' ? 'qrcode' : 'account-search'}
                    onPress={handleResetScanner}
                    disabled={isSearching || isRegistering}
                  >
                    {viewMode === 'scanner'
                      ? student
                        ? 'Limpiar y escanear otro'
                        : 'Reiniciar escaneo'
                      : student
                        ? 'Limpiar y nuevo registro'
                        : 'Limpiar búsqueda'}
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </View>
        </AppScrollView>

        <StudentConfirmModal
          visible={isConfirmModalVisible}
          student={student}
          isSubmitting={isRegistering}
          errorMessage={errorMessage}
          onDismiss={handleCloseConfirmModal}
          onConfirm={() => {
            void handleConfirmAttendance();
          }}
        />
      </View>
    </SafeAreaView>
  );
}
