import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, HelperText, Text, TextInput } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { StudentConfirmModal } from '@/src/components/StudentConfirmModal';
import { registerAttendance } from '@/src/services/attendace';
import { findStudentByCode, searchStudentsByName } from '@/src/services/students';
import { useTripStore } from '@/src/stores/tripStore';
import { colors, fontSize, radius, spacing } from '@/src/theme/theme';
import type { Student } from '@/src/types';

type LookupState = 'idle' | 'searching' | 'found' | 'not_found';

export default function ScannerTabScreen() {
  const { activeTrip } = useTripStore();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
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
  const cameraHeight = Math.max(220, Math.min(340, Math.floor(screenHeight * 0.34)));

  function clearStudentSelection(clearSuccessMessage = false) {
    scanLockedRef.current = false;
    setLookupState('idle');
    setScannedValue('');
    setManualName('');
    setManualCandidates([]);
    setStudent(null);
    setIsConfirmModalVisible(false);
    setIsRegistering(false);
    setErrorMessage(null);
    setInfoMessage(null);

    if (clearSuccessMessage) {
      setSuccessMessage(null);
    }
  }

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
    if (scanLockedRef.current || isSearching || isRegistering || student) {
      return;
    }

    scanLockedRef.current = true;
    void resolveStudentByCode(data);
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
      await registerAttendance(activeTrip.id, student.id, 'boarded');
      clearStudentSelection(false);
      setSuccessMessage(`Asistencia registrada para ${studentName}.`);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo registrar la asistencia.');
    } finally {
      setIsRegistering(false);
    }
  }

  function handleCloseConfirmModal() {
    setIsConfirmModalVisible(false);
  }

  if (!activeTrip) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={[styles.screenContainer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Card mode="outlined" style={styles.blockedCard}>
            <Card.Content style={styles.blockedContent}>
              <MaterialCommunityIcons name="lock-outline" size={38} color={colors.textMuted} />
              <Text style={styles.blockedTitle}>Scanner bloqueado</Text>
              <Text style={styles.blockedBody}>
                Primero debes iniciar un viaje en la pestaña Viaje para habilitar la cámara.
              </Text>
            </Card.Content>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={[styles.screenContainer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Card mode="outlined" style={styles.blockedCard}>
            <Card.Content style={styles.blockedContent}>
              <MaterialCommunityIcons name="camera-outline" size={38} color={colors.textMuted} />
              <Text style={styles.blockedTitle}>Preparando cámara</Text>
              <Text style={styles.blockedBody}>Estamos solicitando acceso a la cámara.</Text>
            </Card.Content>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={[styles.screenContainer, { paddingBottom: insets.bottom + spacing.lg }]}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.lg }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.badge}>
          <MaterialCommunityIcons name="qrcode-scan" size={16} color={colors.primary} />
          <Text style={styles.badgeText}>ESCANER ACTIVO</Text>
        </View>

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

        <Card mode="outlined" style={styles.panel}>
          <Card.Content style={styles.panelContent}>
            <Text style={styles.panelTitle}>Escaneo y confirmación</Text>
            <Text style={styles.panelBody}>
              Escanea el QR o busca al alumno por nombre para registrarlo manualmente.
            </Text>

            <View style={styles.manualBlock}>
              <TextInput
                mode="outlined"
                label="Nombre del alumno"
                value={manualName}
                onChangeText={(value) => {
                  setManualName(value);
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isSearching && !isRegistering}
                returnKeyType="search"
                onSubmitEditing={() => {
                  void handleManualSearch();
                }}
              />
              <Button mode="contained" onPress={handleManualSearch} loading={isSearching} disabled={isRegistering}>
                Buscar por nombre
              </Button>
            </View>

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
                icon="qrcode"
                onPress={handleResetScanner}
                disabled={isSearching || isRegistering}
              >
                {student ? 'Limpiar y escanear otro' : 'Reiniciar escaneo'}
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  blockedCard: {
    flex: 1,
    justifyContent: 'center',
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  blockedContent: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  blockedTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  blockedBody: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionCard: {
    flex: 1,
    justifyContent: 'center',
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  permissionContent: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  permissionTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionBody: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  badge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cameraFrame: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 20, 39, 0.15)',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#a8c7ff',
    borderWidth: 3,
  },
  topLeft: {
    top: 18,
    left: 18,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 18,
    right: 18,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 18,
    left: 18,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 18,
    right: 18,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#a8c7ff',
    opacity: 0.8,
  },
  overlayHint: {
    position: 'absolute',
    bottom: 18,
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(45, 52, 73, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  panelContent: {
    gap: spacing.sm,
  },
  panelTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  panelBody: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  scannedValue: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  manualBlock: {
    gap: spacing.sm,
  },
  matchesBlock: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  matchTextBlock: {
    flex: 1,
    gap: 2,
  },
  matchName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  matchMeta: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  selectionBlock: {
    gap: spacing.sm,
  },
  selectionLabel: {
    color: colors.textLabel,
    fontSize: fontSize.sm,
  },
  actions: {
    gap: spacing.sm,
  },
});
