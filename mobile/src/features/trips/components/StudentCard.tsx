import { StyleSheet, View } from 'react-native';

import { Surface, Text } from 'react-native-paper';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { Student } from '@/src/features/trips/types';

interface StudentCardProps {
  student: Student;
  statusLabel?: string;
}

function formatValue(
  value: string | null | undefined
) {
  return value?.trim()
    ? value
    : 'No registrado';
}

export function StudentCard({
  student,
  statusLabel,
}: StudentCardProps) {
  return (
    <Surface style={styles.card}>
      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="school-outline"
            size={18}
            color="#60A5FA"
          />

          <Text style={styles.infoText}>
            Colegio:{' '}
            {formatValue(
              student.colegio
            )}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="account-heart-outline"
            size={18}
            color="#60A5FA"
          />

          <Text style={styles.infoText}>
            Apoderado:{' '}
            {formatValue(
              student.nombre_apoderado
            )}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="phone-outline"
            size={18}
            color="#60A5FA"
          />

          <Text style={styles.infoText}>
            Teléfono:{' '}
            {formatValue(
              student.telefono_apoderado
            )}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={18}
            color="#60A5FA"
          />

          <Text style={styles.infoText}>
            Dirección:{' '}
            {formatValue(
              student.direccion
            )}
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

    borderRadius: 26,

    padding: 18,

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.05)',

    shadowColor: '#000',

    shadowOpacity: 0.18,

    shadowRadius: 18,

    shadowOffset: {
      width: 0,
      height: 10,
    },

    elevation: 6,
  },

  topSection: {
    flexDirection: 'row',

    alignItems: 'center',
  },

  avatar: {
    width: 58,

    height: 58,

    borderRadius: 29,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: '#2563EB',
  },

  studentInfo: {
    flex: 1,

    marginLeft: 14,

    gap: 4,
  },

  studentName: {
    color: '#F8FAFC',

    fontSize: 18,

    fontWeight: '700',
  },

  studentSubtitle: {
    color: '#94A3B8',

    fontSize: 13,
  },

  statusBadge: {
    backgroundColor:
      'rgba(34,197,94,0.14)',

    paddingHorizontal: 12,

    paddingVertical: 7,

    borderRadius: 999,
  },

  statusText: {
    color: '#4ADE80',

    fontSize: 12,

    fontWeight: '700',
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

    alignItems: 'flex-start',

    gap: 10,
  },

  infoText: {
    flex: 1,

    color: '#E2E8F0',

    fontSize: 14,

    lineHeight: 22,
  },
});