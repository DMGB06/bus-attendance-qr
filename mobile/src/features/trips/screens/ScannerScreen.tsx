import { useRef, useState } from 'react';
import { StyleSheet, View, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, HelperText, Text, TextInput } from 'react-native-paper';
import { StudentConfirmModal } from '@/src/features/trips/components/StudentConfirmModal';
import { registerAttendance } from '@/src/features/trips/services/attendance.service';
import {
  findStudentByCode,
  searchStudentsByName,
} from '@/src/features/trips/services/students.service';
import { useTripStore } from '@/src/features/trips/store/tripStore';
import { colors, fontSize, radius, spacing } from '@/src/core/theme/theme';
import type { Student } from '@/src/features/trips/types';

type LookupState = 'idle' | 'searching' | 'found' | 'not_found';

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const { activeTrip } = useTripStore();
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
  const cameraHeight = Math.max(220, Math.min(360, screenHeight * 0.34));
  /** Padding inferior razonable; un valor grande (p.ej. 100) deja un “vacío” gigante sobre la barra de pestañas. */
  const containerStyle = [styles.screenContainer, { paddingBottom: Math.max(insets.bottom, spacing.md) }];

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
        <ScrollView
          style={styles.panelScroll}
          contentContainerStyle={styles.panelScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.panelFill}>
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
          </View>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#060B18',
  },

  screenContainer: {
    flex: 1,
    backgroundColor: '#060B18',

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

    backgroundColor:
      'rgba(59,130,246,0.10)',

    borderRadius: 999,

    paddingHorizontal: 16,

    paddingVertical: 10,
  },

  badgeText: {
    color: '#60A5FA',

    fontSize: 11,

    fontWeight: '700',

    letterSpacing: 1.1,
  },

  cameraFrame: {
    borderRadius: 32,

    overflow: 'hidden',

    backgroundColor: '#111827',

    borderWidth: 1,

    borderColor:
      'rgba(96,165,250,0.18)',

    position: 'relative',

    shadowColor: '#3B82F6',

    shadowOpacity: 0.18,

    shadowRadius: 30,

    shadowOffset: {
      width: 0,
      height: 12,
    },

    elevation: 10,
  },

  camera: {
    flex: 1,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,

    justifyContent: 'center',

    alignItems: 'center',

    backgroundColor:
      'rgba(6,11,24,0.16)',
  },

  corner: {
    position: 'absolute',

    width: 34,

    height: 34,

    borderColor: '#60A5FA',

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

    backgroundColor: '#60A5FA',

    opacity: 0.95,
  },

  overlayHint: {
    position: 'absolute',

    bottom: 22,

    color: '#F8FAFC',

    fontSize: 12,

    fontWeight: '600',

    backgroundColor:
      'rgba(15,23,42,0.88)',

    paddingHorizontal: 14,

    paddingVertical: 8,

    borderRadius: 999,

    overflow: 'hidden',
  },

  panel: {
    backgroundColor: '#111827',

    borderRadius: 30,

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.04)',

    shadowColor: '#000',

    shadowOpacity: 0.25,

    shadowRadius: 24,

    shadowOffset: {
      width: 0,
      height: 12,
    },

    elevation: 8,
  },

  panelContent: {
    gap: 18,

    paddingVertical: 8,
  },

  panelTitle: {
    color: '#F8FAFC',

    fontSize: 25,

    fontWeight: '700',
  },

  panelBody: {
    color: '#94A3B8',

    fontSize: 14,

    lineHeight: 22,
  },

  manualBlock: {
    gap: 14,
  },

  matchesBlock: {
    gap: 12,

    backgroundColor:
      'rgba(255,255,255,0.03)',

    borderRadius: 22,

    padding: 12,
  },

  matchItem: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    gap: 12,

    backgroundColor:
      'rgba(255,255,255,0.04)',

    borderRadius: 20,

    padding: 14,
  },

  matchTextBlock: {
    flex: 1,

    gap: 4,
  },

  matchName: {
    color: '#F8FAFC',

    fontSize: 15,

    fontWeight: '700',
  },

  matchMeta: {
    color: '#94A3B8',

    fontSize: 13,
  },

  selectionBlock: {
    gap: 12,

    backgroundColor:
      'rgba(59,130,246,0.10)',

    borderRadius: 20,

    padding: 16,
  },

  selectionLabel: {
    color: '#DBEAFE',

    fontSize: 14,

    fontWeight: '600',
  },

  scannedValue: {
    color: '#94A3B8',

    fontSize: 13,
  },

  actions: {
    gap: 12,
  },

  blockedCard: {
    flex: 1,

    justifyContent: 'center',

    backgroundColor: '#111827',

    borderRadius: 28,

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.04)',
  },

  blockedContent: {
    alignItems: 'center',

    gap: 14,

    paddingVertical: 40,
  },

  blockedTitle: {
    color: '#F8FAFC',

    fontSize: 22,

    fontWeight: '700',

    textAlign: 'center',
  },

  blockedBody: {
    color: '#94A3B8',

    textAlign: 'center',

    lineHeight: 22,
  },

  permissionCard: {
    flex: 1,

    justifyContent: 'center',

    backgroundColor: '#111827',

    borderRadius: 28,

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.04)',
  },

  permissionContent: {
    alignItems: 'center',

    gap: 14,

    paddingVertical: 40,
  },

  permissionTitle: {
    color: '#F8FAFC',

    fontSize: 22,

    fontWeight: '700',

    textAlign: 'center',
  },

  permissionBody: {
    color: '#94A3B8',

    textAlign: 'center',

    lineHeight: 22,
  },
});