import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, List, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { getAttendanceByTrip } from '@/src/services/attendace';
import { useTripStore } from '@/src/stores/tripStore';
import type { AttendanceRecord } from '@/src/types';

export default function TripListScreen() {
  const router = useRouter();
  const { activeTrip } = useTripStore();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!activeTrip) {
      setRecords([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    void getAttendanceByTrip(activeTrip.id)
      .then((items) => {
        if (!isMounted) {
          return;
        }
        setRecords(items);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setErrorMessage('No se pudo cargar la lista del viaje.');
      })
      .finally(() => {
        if (!isMounted) {
          return;
        }
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTrip, reloadKey]);

  if (!activeTrip) {
    return (
      <View style={styles.container}>
        <Card mode="outlined">
          <Card.Title title="Sin viaje activo" />
          <Card.Content style={styles.content}>
            <Text variant="bodyMedium">Inicia un viaje para ver la asistencia.</Text>
            <Button mode="contained" onPress={() => router.replace('/')}>
              Ir a inicio
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card mode="outlined">
        <Card.Title title="Lista del viaje" subtitle={`Viaje ${activeTrip.direction}`} />
        <Card.Content style={styles.content}>
          <Button mode="outlined" onPress={() => setReloadKey((value) => value + 1)} loading={isLoading} disabled={isLoading}>
            Actualizar
          </Button>
          {errorMessage ? <HelperText type="error">{errorMessage}</HelperText> : null}
          {!isLoading && records.length === 0 ? (
            <Text variant="bodyMedium">Todavía no hay asistencias registradas.</Text>
          ) : null}
        </Card.Content>
      </Card>

      <Card mode="outlined" style={styles.listCard}>
        <Card.Content style={styles.listContent}>
          <ScrollView>
            {records.map((item) => (
              <List.Item
                key={item.id}
                title={item.student_id}
                description={`${item.event_type} • ${new Date(item.scanned_at).toLocaleTimeString()}`}
                left={(props) => <List.Icon {...props} icon="account-school-outline" />}
              />
            ))}
          </ScrollView>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
    padding: 16,
  },
  content: {
    gap: 10,
  },
  listCard: {
    flex: 1,
  },
  listContent: {
    flex: 1,
  },
});
