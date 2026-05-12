import { useState } from 'react';

import {
  Alert,
  StyleSheet,
  View,
  ScrollView,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';

import {
  Button,
  Card,
  HelperText,
  Text,
  Surface,
} from 'react-native-paper';

import {
  MaterialCommunityIcons,
} from '@expo/vector-icons';

import {
  TripHeader,
} from '@/src/features/trips/components/TripHeader';

import {
  getPendingDropoffStudents,
} from '@/src/features/trips/services/attendance.service';

import {
  closeTrip,
} from '@/src/features/trips/services/trips.service';

import {
  useTripStore,
} from '@/src/features/trips/store/tripStore';

import {
  colors,
  fontSize,
  spacing,
} from '@/src/core/theme/theme';

function confirmCloseWithPendingStudents(
  studentNames: string[],
  totalPending: number
) {
  const hasMoreStudents =
    totalPending >
    studentNames.length;

  const shownList =
    studentNames.join(', ');

  const summaryLine =
    hasMoreStudents
      ? `${shownList} y ${totalPending -
      studentNames.length
      } más`
      : shownList;

  return new Promise<boolean>(
    (resolve) => {
      Alert.alert(
        'Hay alumnos sin bajada',

        `Aún hay ${totalPending} alumno(s) con abordo sin registro de bajada.\n\n${summaryLine}\n\n¿Deseas cerrar el viaje de todas formas?`,

        [
          {
            text: 'Cancelar',

            style: 'cancel',

            onPress: () =>
              resolve(false),
          },

          {
            text: 'Cerrar viaje',

            style: 'destructive',

            onPress: () =>
              resolve(true),
          },
        ],

        { cancelable: false }
      );
    }
  );
}

export default function CloseTripScreen() {
  const router = useRouter();

  const insets =
    useSafeAreaInsets();

  const {
    activeTrip,
    clearActiveTrip,
  } = useTripStore();

  const [isClosing, setIsClosing] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null
  );

  async function handleCloseTrip() {
    if (!activeTrip) {
      setErrorMessage(
        'No hay viaje activo para cerrar.'
      );

      return;
    }

    setIsClosing(true);

    setErrorMessage(null);

    try {
      const pendingDropoffStudents =
        await getPendingDropoffStudents(
          activeTrip.id
        );

      if (
        pendingDropoffStudents.length >
        0
      ) {
        const firstStudents =
          pendingDropoffStudents
            .slice(0, 5)
            .map(
              (student) =>
                student.nombre_alumno
            );

        const shouldClose =
          await confirmCloseWithPendingStudents(
            firstStudents,
            pendingDropoffStudents.length
          );

        if (!shouldClose) {
          return;
        }
      }

      await closeTrip(
        activeTrip.id
      );

      clearActiveTrip();

      router.replace(
        '/(tabs)/trip'
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo cerrar el viaje.'
      );
    } finally {
      setIsClosing(false);
    }
  }

  if (!activeTrip) {
    return (
      <SafeAreaView
        edges={[
          'bottom',
          'left',
          'right',
        ]}
        style={styles.safeArea}
      >
        <View
          style={[
            styles.emptyContainer,

            {
              paddingBottom:
                insets.bottom + 18,
            },
          ]}
        >
          <Surface
            style={styles.emptyCard}
          >
            <MaterialCommunityIcons
              name="bus-stop"
              size={54}
              color="#64748B"
            />

            <Text
              style={
                styles.emptyTitle
              }
            >
              Sin viaje activo
            </Text>

            <Text
              style={
                styles.emptyBody
              }
            >
              No existe un viaje
              en curso para cerrar.
            </Text>

            <Button
              mode="contained"
              onPress={() =>
                router.replace(
                  '/(tabs)/trip'
                )
              }
              style={
                styles.homeButton
              }
              contentStyle={
                styles.buttonContent
              }
            >
              Ir al inicio
            </Button>
          </Surface>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={[
        'bottom',
        'left',
        'right',
      ]}
      style={styles.safeArea}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,

          {
            paddingBottom:
              insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.header}>
          <View
            style={styles.iconBox}
          >
            <MaterialCommunityIcons
              name="bus-alert"
              size={26}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.title}>
            Cerrar viaje
          </Text>

          <Text
            style={styles.subtitle}
          >
            Revisa toda la
            información antes de
            finalizar el recorrido.
          </Text>
        </View>

        <TripHeader
          trip={activeTrip}
        />

        <Surface
          style={styles.warningCard}
        >
          <View
            style={
              styles.warningTop
            }
          >
            <View
              style={
                styles.warningIcon
              }
            >
              <MaterialCommunityIcons
                name="alert-outline"
                size={18}
                color="#FACC15"
              />
            </View>

            <Text
              style={
                styles.warningTitle
              }
            >
              Validación previa
            </Text>
          </View>

          <Text
            style={
              styles.warningBody
            }
          >
            El sistema verificará
            alumnos con abordo
            pendiente antes de
            permitir cerrar el
            viaje.
          </Text>
        </Surface>

        <Card
          mode="outlined"
          style={styles.actionCard}
        >
          <Card.Content
            style={styles.content}
          >
            {errorMessage ? (
              <HelperText type="error">
                {errorMessage}
              </HelperText>
            ) : null}

            <Button
              mode="contained"
              onPress={
                handleCloseTrip
              }
              loading={isClosing}
              disabled={isClosing}
              style={
                styles.closeButton
              }
              contentStyle={
                styles.buttonContent
              }
              labelStyle={
                styles.closeLabel
              }
              icon="check-circle"
            >
              Finalizar viaje
            </Button>

            <Button
              mode="outlined"
              onPress={() =>
                router.back()
              }
              disabled={isClosing}
              style={
                styles.backButton
              }
              contentStyle={
                styles.buttonContent
              }
              labelStyle={
                styles.backLabel
              }
            >
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

    backgroundColor:
      '#0B1120',
  },

  container: {
    paddingHorizontal: 22,

    paddingTop: 18,

    gap: 18,
  },

  header: {
    alignItems: 'center',

    gap: 10,

    marginBottom: 6,
  },

  iconBox: {
    width: 72,

    height: 72,

    borderRadius: 36,

    backgroundColor:
      '#2563EB',

    alignItems: 'center',

    justifyContent: 'center',

    shadowColor: '#2563EB',

    shadowOpacity: 0.35,

    shadowRadius: 18,

    shadowOffset: {
      width: 0,
      height: 10,
    },

    elevation: 8,
  },

  title: {
    color: '#F8FAFC',

    fontSize: 30,

    fontWeight: '700',

    textAlign: 'center',
  },

  subtitle: {
    color: '#94A3B8',

    fontSize: 15,

    lineHeight: 22,

    textAlign: 'center',

    paddingHorizontal: 8,
  },

  warningCard: {
    backgroundColor:
      'rgba(245,158,11,0.08)',

    borderRadius: 24,

    padding: 18,

    borderWidth: 1,

    borderColor:
      'rgba(245,158,11,0.18)',

    gap: 14,
  },

  warningTop: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 12,
  },

  warningIcon: {
    width: 38,

    height: 38,

    borderRadius: 19,

    backgroundColor:
      'rgba(250,204,21,0.12)',

    alignItems: 'center',

    justifyContent: 'center',
  },

  warningTitle: {
    color: '#FCD34D',

    fontSize: 16,

    fontWeight: '700',
  },

  warningBody: {
    color: '#CBD5E1',

    fontSize: 14,

    lineHeight: 22,
  },

  actionCard: {
    backgroundColor:
      'rgba(255,255,255,0.04)',

    borderRadius: 26,

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.05)',

    overflow: 'hidden',
  },

  content: {
    gap: 14,
  },

  closeButton: {
    borderRadius: 18,

    backgroundColor:
      '#2563EB',
  },

  backButton: {
    borderRadius: 18,

    borderColor:
      'rgba(255,255,255,0.08)',
  },

  buttonContent: {
    height: 56,
  },

  closeLabel: {
    fontSize: 15,

    fontWeight: '700',
  },

  backLabel: {
    fontSize: 15,

    fontWeight: '600',
  },

  emptyContainer: {
    flex: 1,

    justifyContent: 'center',

    paddingHorizontal: 22,
  },

  emptyCard: {
    backgroundColor:
      'rgba(255,255,255,0.04)',

    borderRadius: 30,

    padding: 28,

    alignItems: 'center',

    gap: 16,

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.05)',
  },

  emptyTitle: {
    color: '#F8FAFC',

    fontSize: 24,

    fontWeight: '700',
  },

  emptyBody: {
    color: '#94A3B8',

    textAlign: 'center',

    lineHeight: 22,

    fontSize: 14,
  },

  homeButton: {
    marginTop: 8,

    borderRadius: 18,

    backgroundColor:
      '#2563EB',

    width: '100%',
  },
});