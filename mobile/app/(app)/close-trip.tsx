import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, HelperText, Text } from 'react-native-paper';

import { closeTrip } from '@/src/services/trips';
import { useTripStore } from '@/src/stores/tripStore';

export default function CloseTripScreen() {
  const router = useRouter();
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

    const wasClosed = await closeTrip(activeTrip.id).catch(() => false);

    setIsClosing(false);

    if (!wasClosed) {
      setErrorMessage('No se pudo cerrar el viaje.');
      return;
    }

    clearActiveTrip();
    router.replace('/');
  }

  if (!activeTrip) {
    return (
      <View style={styles.container}>
        <Card mode="outlined">
          <Card.Title title="Sin viaje activo" />
          <Card.Content style={styles.content}>
            <Text variant="bodyMedium">No hay un viaje en curso para cerrar.</Text>
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
        <Card.Title title="Cerrar viaje" subtitle={`Viaje ${activeTrip.direction}`} />
        <Card.Content style={styles.content}>
          <Text variant="bodyMedium">
            Esta acción marcará el viaje como completado y cerrará el estado activo local.
          </Text>
          {errorMessage ? <HelperText type="error">{errorMessage}</HelperText> : null}
          <Button mode="contained" onPress={handleCloseTrip} loading={isClosing} disabled={isClosing}>
            Cerrar viaje
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  content: {
    gap: 12,
  },
});
