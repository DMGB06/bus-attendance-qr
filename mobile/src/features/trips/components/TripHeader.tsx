import { StyleSheet, View } from 'react-native';

import {
  Surface,
  Text,
} from 'react-native-paper';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import type {
  Trip,
  TripDirection,
  TripStatus,
} from '@/src/features/trips/types';

interface TripHeaderProps {
  trip: Trip;
}

export function formatTripDirectionLabel(
  direction: TripDirection
): string {
  if (direction === 'recojo') {
    return 'Recojo';
  }

  if (direction === 'retorno') {
    return 'Retorno';
  }

  return direction;
}

export function formatTripStatusLabel(
  status: TripStatus
): string {
  if (status === 'active') {
    return 'Activo';
  }

  if (status === 'completed') {
    return 'Completado';
  }

  return status;
}

export function TripHeader({
  trip,
}: TripHeaderProps) {
  const startedAtLabel = trip.started_at
    ? new Date(
      trip.started_at
    ).toLocaleString()
    : 'Sin hora de inicio';

  const isActive =
    trip.status === 'active';

  return (
    <Surface style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name={
              trip.direction === 'recojo'
                ? 'arrow-up'
                : 'arrow-down'
            }
            size={20}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            Viaje{' '}
            {formatTripDirectionLabel(
              trip.direction
            )}
          </Text>

          <Text style={styles.subtitle}>
            Transporte escolar
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,

            isActive &&
            styles.statusBadgeActive,
          ]}
        >
          <Text
            style={[
              styles.statusText,

              isActive &&
              styles.statusTextActive,
            ]}
          >
            {formatTripStatusLabel(
              trip.status
            )}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="calendar-month-outline"
            size={18}
            color="#60A5FA"
          />

          <Text style={styles.infoText}>
            {trip.trip_date}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={18}
            color="#60A5FA"
          />

          <Text style={styles.infoText}>
            {startedAtLabel}
          </Text>
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor:
      'rgba(255,255,255,0.04)',

    borderRadius: 24,

    padding: 20,

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.06)',
  },

  topRow: {
    flexDirection: 'row',

    alignItems: 'center',
  },

  iconContainer: {
    width: 46,
    height: 46,

    borderRadius: 23,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: '#2563EB',
  },

  titleContainer: {
    flex: 1,

    marginLeft: 14,
  },

  title: {
    color: '#F8FAFC',

    fontSize: 18,

    fontWeight: '700',
  },

  subtitle: {
    color: '#94A3B8',

    fontSize: 13,

    marginTop: 2,
  },

  statusBadge: {
    paddingHorizontal: 12,

    paddingVertical: 6,

    borderRadius: 999,

    backgroundColor:
      'rgba(148,163,184,0.12)',
  },

  statusBadgeActive: {
    backgroundColor:
      'rgba(34,197,94,0.16)',
  },

  statusText: {
    color: '#CBD5E1',

    fontSize: 12,

    fontWeight: '700',
  },

  statusTextActive: {
    color: '#4ADE80',
  },

  divider: {
    height: 1,

    backgroundColor:
      'rgba(255,255,255,0.06)',

    marginVertical: 18,
  },

  infoContainer: {
    gap: 14,
  },

  infoRow: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 10,
  },

  infoText: {
    color: '#CBD5E1',

    fontSize: 14,
  },
});