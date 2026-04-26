import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, HelperText, Text, TextInput } from 'react-native-paper';

import { StudentCard } from '@/src/components/StudentCard';
import { registerAttendance } from '@/src/services/attendace';
import { findStudentByLookup } from '@/src/services/students';
import { useTripStore } from '@/src/stores/tripStore';
import { colors, fontSize, radius, spacing } from '@/src/theme/theme';
import type { Student } from '@/src/types';

type LookupState = 'idle' | 'searching' | 'found' | 'not_found';

export default function ScannerTabScreen() {
  const { activeTrip } = useTripStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const isSearching = lookupState === 'searching';
  const [scannedValue, setScannedValue] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const scanLockedRef = useRef(false);

  async function resolveStudent(value: string) {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      setErrorMessage('Ingresa un código válido.');
      return;
    }

    setLookupState('searching');
    setErrorMessage(null);
    setSuccessMessage(null);
    setStudent(null);
    setScannedValue(normalizedValue);
    setManualCode(normalizedValue);

    try {
      const foundStudent = await findStudentByLookup(normalizedValue);

      if (!foundStudent) {
        setLookupState('not_found');
        setErrorMessage('No se encontró el alumno. Puedes probar con el código manual.');
        return;
      }

      setStudent(foundStudent);
      setLookupState('found');
    } catch (error: unknown) {
      setLookupState('idle');
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo buscar al alumno.');
    }
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    if (scanLockedRef.current || isSearching || isRegistering || student) {
      return;
    }

    scanLockedRef.current = true;
    void resolveStudent(data);
  }

  function handleResetScanner() {
    scanLockedRef.current = false;
    setLookupState('idle');
    setScannedValue('');
    setManualCode('');
    setStudent(null);
    setIsRegistering(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  async function handleManualSearch() {
    if (isSearching || isRegistering) {
      return;
    }

    scanLockedRef.current = true;
    await resolveStudent(manualCode);
  }

  async function handleConfirmAttendance() {
    if (!activeTrip || !student) {
      return;
    }

    setIsRegistering(true);
    setErrorMessage(null);

    try {
      await registerAttendance(activeTrip.id, student.id, 'boarded');
      setSuccessMessage(`Asistencia registrada para ${student.nombre_alumno}.`);
      scanLockedRef.current = true;
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo registrar la asistencia.');
    } finally {
      setIsRegistering(false);
    }
  }

  if (!activeTrip) {
    return (
      <View style={styles.container}>
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
    );
  }

  if (!permission) {
    return (
      <View style={styles.container}>
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
      <View style={styles.container}>
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
    <View style={styles.container}>
      <View style={styles.badge}>
        <MaterialCommunityIcons name="qrcode-scan" size={16} color={colors.primary} />
        <Text style={styles.badgeText}>ESCANER ACTIVO</Text>
      </View>

      <View style={styles.cameraFrame}>
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
            Escanea el QR o ingresa el código manual. Luego confirma la asistencia del alumno.
          </Text>

          {student ? <StudentCard student={student} /> : null}

          {lookupState === 'not_found' ? (
            <View style={styles.manualBlock}>
              <TextInput
                mode="outlined"
                label="Código manual"
                value={manualCode}
                onChangeText={(value) => {
                  setManualCode(value);
                  setErrorMessage(null);
                }}
                autoCapitalize="none"
                editable={!isRegistering}
              />
               <Button mode="contained" onPress={handleManualSearch} loading={isSearching}>
                 Buscar código
               </Button>
            </View>
          ) : null}

          {scannedValue ? (
            <Text style={styles.scannedValue}>Valor leído: {scannedValue}</Text>
          ) : null}

          {errorMessage ? <HelperText type="error">{errorMessage}</HelperText> : null}
          {successMessage ? <HelperText type="info">{successMessage}</HelperText> : null}

          {student ? (
            <View style={styles.actions}>
              <Button
                mode="contained"
                icon="check"
                onPress={handleConfirmAttendance}
                loading={isRegistering}
                disabled={isRegistering}
              >
                Confirmar asistencia
              </Button>
              <Button mode="outlined" icon="qrcode-scan" onPress={handleResetScanner} disabled={isRegistering}>
                Escanear otro
              </Button>
            </View>
          ) : (
            <View style={styles.actions}>
              <Button mode="contained-tonal" icon="qrcode" onPress={handleResetScanner} disabled={isRegistering}>
                Reiniciar escaneo
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    flex: 1,
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
    fontSize: 24,
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
  actions: {
    gap: spacing.sm,
  },
});
