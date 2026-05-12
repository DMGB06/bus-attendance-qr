import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Modal, Portal, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StudentCard } from '@/src/features/trips/components/StudentCard';
import { spacing } from '@/src/core/theme/theme';
import type { Student } from '@/src/features/trips/types';

interface StudentConfirmModalProps {
  visible: boolean;
  student: Student | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onDismiss: () => void;
  onConfirm: () => void;
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

  if (!student) return null;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={() => { if (!isSubmitting) onDismiss(); }}
        contentContainerStyle={styles.modalContainer}
      >
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>

          {/* Handle */}
          <View style={styles.handle} />

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Confirmar asistencia</Text>
            <Text style={styles.subtitle}>
              Verifica los datos del alumno antes de registrar el abordo.
            </Text>

            {/* Header alumno */}
            <View style={styles.studentHeader}>
              <View style={styles.studentAvatar}>
                <MaterialCommunityIcons name="account" size={30} color="#FFFFFF" />
              </View>
              <View style={styles.studentHeaderInfo}>
                <Text style={styles.studentName}>{student.nombre_alumno}</Text>
                <Text style={styles.studentStatus}>Pendiente de confirmación</Text>
              </View>
            </View>

            <StudentCard student={student} statusLabel="Pendiente de confirmación" />

            {errorMessage ? (
              <HelperText type="error" style={styles.errorText}>
                {errorMessage}
              </HelperText>
            ) : null}

            <View style={styles.actions}>
              <Button
                mode="contained"
                onPress={onConfirm}
                loading={isSubmitting}
                disabled={isSubmitting}
                contentStyle={styles.btnContent}
                style={styles.btnConfirm}
              >
                Confirmar asistencia
              </Button>
              <Button
                mode="outlined"
                onPress={onDismiss}
                disabled={isSubmitting}
                contentStyle={styles.btnContent}
                style={styles.btnCancel}
              >
                Cancelar
              </Button>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'flex-end',
    margin: 0,
    flex: 1,
  },

  sheet: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderBottomWidth: 0,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
  },

  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 20,
  },

  scrollContent: {
    gap: 20,
    paddingBottom: 8,
  },

  title: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },

  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: -8,
  },

  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(59,130,246,0.10)',
    borderRadius: 22,
    padding: 18,
  },

  studentAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  studentHeaderInfo: {
    flex: 1,
    gap: 6,
  },

  studentName: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },

  studentStatus: {
    color: '#93C5FD',
    fontSize: 13,
    fontWeight: '600',
  },

  errorText: {
    marginTop: -8,
  },

  actions: {
    gap: 12,
    marginTop: 4,
  },

  btnContent: {
    paddingVertical: 6,
  },

  btnConfirm: {
    borderRadius: 14,
  },

  btnCancel: {
    borderRadius: 14,
  },
});