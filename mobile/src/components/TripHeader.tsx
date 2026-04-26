import { StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';

import type { Trip } from '@/src/types';

interface TripHeaderProps {
  trip: Trip;
}

export function TripHeader({ trip }: TripHeaderProps) {
  const startedAt = new Date(trip.started_at);

  return (
    <Card mode="outlined">
      <Card.Title title={`Viaje activo: ${trip.direction.toUpperCase()}`} subtitle={`Estado: ${trip.status}`} />
      <Card.Content style={styles.content}>
        <Text variant="bodyMedium">Inicio: {startedAt.toLocaleString()}</Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 6,
  },
});
