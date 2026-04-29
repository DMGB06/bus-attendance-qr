import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, Modal, Portal, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StudentCard } from '@/src/components/StudentCard';
import { colors, fontSize, spacing } from '@/src/theme/theme';
import type { Student } from '@/src/types';

interface StudentConfirmModalProps {
  visible: boolean;
  student: Student | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onDismiss: () => void;
  onConfirm: () => void;
}

function formatStudentValue(value: string | null | undefined) {
  return value?.trim() ? value : 'No registrado';
}

export function StudentConfirmModal({
  visible,
  student,
  isSubmitting,
  errorMessage,
  onDismiss,
  onConfirm,
}: StudentConfirmModalProps) {
  const insets = useSafeAreaInsets();

  if (!student) {
    return null;
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={() => {
          if (!isSubmitting) {
            onDismiss();
          }
        }}
        contentContainerStyle={[
          styles.modalContainer,
          { marginBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <Card mode="outlined" style={styles.card}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Card.Content style={styles.content}>
              <Text style={styles.title}>Confirmar asistencia</Text>
              <Text style={styles.subtitle}>
                Verifica los datos del alumno antes de registrar el abordo.
              </Text>

              <StudentCard student={student} statusLabel="Pendiente de confirmación" />

              <View style={styles.extraDataBlock}>
                <Text style={styles.extraLabel}>Colegio: {formatStudentValue(student.colegio)}</Text>
                <Text style={styles.extraLabel}>
                  Apoderado: {formatStudentValue(student.nombre_apoderado)}
                </Text>
                <Text style={styles.extraLabel}>
                  Teléfono: {formatStudentValue(student.telefono_apoderado)}
                </Text>
                <Text style={styles.extraLabel}>
                  Dirección: {formatStudentValue(student.direccion)}
                </Text>
              </View>

              {errorMessage ? <HelperText type="error">{errorMessage}</HelperText> : null}

              <View style={styles.actions}>
                <Button mode="contained" onPress={onConfirm} loading={isSubmitting} disabled={isSubmitting}>
                  Confirmar asistencia
                </Button>
                <Button mode="outlined" onPress={onDismiss} disabled={isSubmitting}>
                  Cancelar
                </Button>
              </View>
            </Card.Content>
          </ScrollView>
        </Card>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    marginHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    maxHeight: '90%',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    lineHeight: 18,
  },
  extraDataBlock: {
    gap: spacing.xs,
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    padding: spacing.sm,
  },
  extraLabel: {
    color: colors.textLabel,
    fontSize: fontSize.sm,
  },
  actions: {
    gap: spacing.sm,
  },
});
