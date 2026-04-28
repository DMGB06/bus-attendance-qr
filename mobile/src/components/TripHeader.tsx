import { StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';

import type { Trip } from '@/src/types';

interface TripHeaderProps {
  trip: Trip;
}

export function TripHeader({ trip }: TripHeaderProps) {
  const startedAtLabel = trip.started_at ? new Date(trip.started_at).toLocaleString() : 'Sin hora de inicio';

  return (
    <Card mode="outlined">
      <Card.Title
        title={`Viaje ${trip.direction.toUpperCase()}`}
        subtitle={`Estado: ${trip.status.toUpperCase()}`}
      />
      <Card.Content style={styles.content}>
        <Text variant="bodyMedium">Fecha: {trip.trip_date}</Text>
        <Text variant="bodyMedium">Inicio: {startedAtLabel}</Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 6,
  },
});
