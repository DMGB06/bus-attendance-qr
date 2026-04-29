import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, HelperText, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { TripHeader } from '@/src/components/TripHeader';
import { getPendingDropoffStudents } from '@/src/services/attendace';
import { closeTrip } from '@/src/services/trips';
import { useTripStore } from '@/src/stores/tripStore';
import { colors, fontSize, spacing } from '@/src/theme/theme';

function confirmCloseWithPendingStudents(studentNames: string[], totalPending: number) {
  const hasMoreStudents = totalPending > studentNames.length;
  const shownList = studentNames.join(', ');
  const summaryLine = hasMoreStudents
    ? `${shownList} y ${totalPending - studentNames.length} más`
    : shownList;

  return new Promise<boolean>((resolve) => {
    Alert.alert(
      'Hay alumnos sin bajada',
      `Aún hay ${totalPending} alumno(s) con abordo sin registro de bajada.\n\n${summaryLine}\n\n¿Deseas cerrar el viaje de todas formas?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Cerrar viaje',
          style: 'destructive',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: false },
    );
  });
}

export default function CloseTripScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeTrip, clearActiveTrip } = useTripStore();
  const [isClosing, setIsClosing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleCloseTrip() {
    if (!activeTrip) {
      setErrorMessage('No hay viaje activo para cerrar.');
      return;
    }

    setIsClosing(true);
    setErrorMessage(null);

    try {
      const pendingDropoffStudents = await getPendingDropoffStudents(activeTrip.id);
      if (pendingDropoffStudents.length > 0) {
        const firstStudents = pendingDropoffStudents
          .slice(0, 5)
          .map((student) => student.nombre_alumno);

        const shouldClose = await confirmCloseWithPendingStudents(
          firstStudents,
          pendingDropoffStudents.length,
        );
        if (!shouldClose) {
          return;
        }
      }

      await closeTrip(activeTrip.id);
      clearActiveTrip();
      router.replace('/');
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo cerrar el viaje.');
    } finally {
      setIsClosing(false);
    }
  }

  if (!activeTrip) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={[styles.container, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Card mode="outlined" style={styles.emptyStateCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons name="bus-stop" size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Sin viaje activo</Text>
              <Text style={styles.emptyBody}>No hay un viaje en curso para cerrar.</Text>
              <Button mode="contained" onPress={() => router.replace('/')}>
                Ir a inicio
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
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Cerrar viaje</Text>
          <Text style={styles.subtitle}>Revisa la información antes de confirmar el cierre.</Text>
        </View>

        <TripHeader trip={activeTrip} />

        <Card mode="outlined" style={styles.warningCard}>
          <Card.Content style={styles.warningContent}>
            <View style={styles.warningHeader}>
              <MaterialCommunityIcons name="alert-outline" size={18} color="#fcd34d" />
              <Text style={styles.warningTitle}>Validación previa</Text>
            </View>
            <Text style={styles.warningBody}>
              Verificaremos alumnos con abordo sin bajada registrada y te pediremos confirmación antes de cerrar.
            </Text>
          </Card.Content>
        </Card>

        <Card mode="outlined" style={styles.actionCard}>
          <Card.Content style={styles.content}>
            {errorMessage ? <HelperText type="error">{errorMessage}</HelperText> : null}
            <Button mode="contained" onPress={handleCloseTrip} loading={isClosing} disabled={isClosing}>
              Cerrar viaje
            </Button>
            <Button mode="outlined" onPress={() => router.back()} disabled={isClosing}>
              Volver
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  content: {
    gap: spacing.sm,
  },
  warningCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  warningContent: {
    gap: spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    paddingLeft: spacing.md,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  warningTitle: {
    color: '#fcd34d',
    fontWeight: '700',
    fontSize: fontSize.md,
  },
  warningBody: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  actionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  emptyStateCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  emptyContent: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  emptyBody: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
