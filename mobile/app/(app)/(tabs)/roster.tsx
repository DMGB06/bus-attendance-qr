import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, Searchbar, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { RosterStudentRow } from '@/src/components/roster/RosterStudentRow';
import {
  getTripRoster,
  markStudentExit,
  markStudentManually,
  type TripRosterItem,
} from '@/src/services/tripRoster';
import { useTripStore } from '@/src/stores/tripStore';
import { colors, radius, spacing } from '@/src/theme/theme';

type RosterViewMode = 'all' | 'attended';

function confirmManualAttendance(studentName: string) {
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      'Confirmar registro manual',
      `¿Registrar manualmente a ${studentName}?\n\nEsta acción no se puede deshacer desde esta pantalla.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Confirmar',
          style: 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: false },
    );
  });
}

function confirmStudentDropoff(studentName: string) {
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      'Confirmar salida',
      `¿Registrar salida para ${studentName}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Confirmar',
          style: 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: false },
    );
  });
}

export default function RosterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeTrip } = useTripStore();
  const [viewMode, setViewMode] = useState<RosterViewMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<TripRosterItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isMarkingStudentId, setIsMarkingStudentId] = useState<string | null>(null);

  const loadRoster = useCallback(async () => {
    if (!activeTrip) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const rosterItems = await getTripRoster(activeTrip.id);
      setItems(rosterItems);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo cargar la lista de asistencia.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTrip]);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  const handleManualMark = useCallback(
    async (studentId: string) => {
      if (!activeTrip || isMarkingStudentId) {
        return;
      }

      const selectedStudent = items.find((item) => item.student.id === studentId)?.student;
      if (!selectedStudent) {
        setErrorMessage('No se encontró el alumno seleccionado.');
        return;
      }

      const isConfirmed = await confirmManualAttendance(selectedStudent.nombre_alumno);
      if (!isConfirmed) {
        return;
      }

      setIsMarkingStudentId(studentId);
      setErrorMessage(null);
      setInfoMessage(null);

      try {
        await markStudentManually(activeTrip.id, studentId);
        setInfoMessage('Registro manual guardado.');
        await loadRoster();
      } catch (error: unknown) {
        setErrorMessage(error instanceof Error ? error.message : 'No se pudo registrar manualmente.');
      } finally {
        setIsMarkingStudentId(null);
      }
    },
    [activeTrip, isMarkingStudentId, items, loadRoster],
  );

  const handleExitMark = useCallback(
    async (studentId: string) => {
      if (!activeTrip || isMarkingStudentId) {
        return;
      }

      const selectedStudent = items.find((item) => item.student.id === studentId)?.student;
      if (!selectedStudent) {
        setErrorMessage('No se encontró el alumno seleccionado.');
        return;
      }

      const isConfirmed = await confirmStudentDropoff(selectedStudent.nombre_alumno);
      if (!isConfirmed) {
        return;
      }

      setIsMarkingStudentId(studentId);
      setErrorMessage(null);
      setInfoMessage(null);

      try {
        await markStudentExit(activeTrip.id, studentId);
        setInfoMessage('Salida registrada correctamente.');
        await loadRoster();
      } catch (error: unknown) {
        setErrorMessage(error instanceof Error ? error.message : 'No se pudo registrar la salida.');
      } finally {
        setIsMarkingStudentId(null);
      }
    },
    [activeTrip, isMarkingStudentId, items, loadRoster],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const baseItems =
      viewMode === 'attended'
        ? items.filter((item) => item.hasAttendance)
        : items;

    if (!normalizedQuery) {
      return baseItems;
    }

    return baseItems.filter((item) => {
      return (
        item.student.nombre_alumno.toLowerCase().includes(normalizedQuery) ||
        item.student.id.toLowerCase().includes(normalizedQuery) ||
        (item.student.codigo ?? '').toLowerCase().includes(normalizedQuery)
      );
    });
  }, [items, searchQuery, viewMode]);

  const attendedCount = items.filter((item) => item.hasAttendance).length;
  const onboardCount = items.filter((item) => item.status === 'onboard').length;
  const pendingCount = items.filter((item) => item.status === 'pending').length;

  if (!activeTrip) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={[styles.container, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Card mode="outlined" style={styles.emptyStateCard}>
            <Card.Content style={styles.emptyContent}>
              <Text style={styles.emptyTitle}>Sin viaje activo</Text>
              <Text style={styles.emptyBody}>Inicia un viaje para ver la lista de asistencia.</Text>
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
      <View style={[styles.container, { paddingBottom: insets.bottom + spacing.sm }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Lista de asistencia</Text>
          <Text style={styles.subtitle}>Viaje {activeTrip.direction.toUpperCase()}</Text>
        </View>

        <Searchbar
          placeholder="Buscar por nombre, código o ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.search}
          inputStyle={styles.searchInput}
        />

        <View style={styles.filterRow}>
          <Button mode={viewMode === 'all' ? 'contained' : 'outlined'} onPress={() => setViewMode('all')}>
            Todos
          </Button>
          <Button
            mode={viewMode === 'attended' ? 'contained' : 'outlined'}
            onPress={() => setViewMode('attended')}
          >
            Asistieron
          </Button>
        </View>

        <View style={styles.summaryRow}>
          <Card mode="outlined" style={styles.summaryCard}>
            <Card.Content style={styles.summaryContent}>
              <Text style={styles.summaryValue}>{attendedCount}</Text>
              <Text style={styles.summaryLabel}>Asistieron</Text>
            </Card.Content>
          </Card>
          <Card mode="outlined" style={styles.summaryCard}>
            <Card.Content style={styles.summaryContent}>
              <Text style={styles.summaryValue}>{onboardCount}</Text>
              <Text style={styles.summaryLabel}>En bus</Text>
            </Card.Content>
          </Card>
          <Card mode="outlined" style={styles.summaryCard}>
            <Card.Content style={styles.summaryContent}>
              <Text style={styles.summaryValue}>{pendingCount}</Text>
              <Text style={styles.summaryLabel}>Pendientes</Text>
            </Card.Content>
          </Card>
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}

        {errorMessage ? <HelperText type="error">{errorMessage}</HelperText> : null}
        {infoMessage ? <HelperText type="info">{infoMessage}</HelperText> : null}

        {!isLoading && filteredItems.length === 0 ? (
          <Card mode="outlined" style={styles.emptyStateCard}>
            <Card.Content style={styles.emptyContent}>
              <Text style={styles.emptyTitle}>Sin resultados</Text>
              <Text style={styles.emptyBody}>
                {viewMode === 'attended'
                  ? 'Aún no hay estudiantes con asistencia registrada.'
                  : 'No encontramos alumnos con ese filtro.'}
              </Text>
            </Card.Content>
          </Card>
        ) : null}

        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.student.id}
          renderItem={({ item }) => (
            <RosterStudentRow
              item={item}
              onMarkManual={handleManualMark}
              onMarkExit={handleExitMark}
              isMarkingManual={isMarkingStudentId === item.student.id && item.canMarkManual}
              isMarkingExit={isMarkingStudentId === item.student.id && item.canMarkExit}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.md }]}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshing={isLoading}
          onRefresh={() => void loadRoster()}
          style={styles.listView}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  header: {
    gap: 2,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
  },
  search: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  searchInput: {
    color: colors.textPrimary,
    minHeight: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  summaryContent: {
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  loading: {
    paddingVertical: spacing.sm,
  },
  list: {
    paddingBottom: spacing.md,
  },
  listView: {
    flex: 1,
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
    fontSize: 18,
    fontWeight: '700',
  },
  emptyBody: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
