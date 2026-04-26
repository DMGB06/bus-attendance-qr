import { StyleSheet, View } from 'react-native';
import { Avatar, Chip, Text } from 'react-native-paper';

import type { TripRosterItem } from '@/src/services/tripRoster';
import { colors, radius, spacing } from '@/src/theme/theme';

interface RosterStudentRowProps {
  item: TripRosterItem;
}

function getChipStyles(status: TripRosterItem['status']) {
  return status === 'registered' ? styles.chipRegistered : styles.chipPending;
}

function getChipLabel(item: TripRosterItem) {
  if (!item.attendance) {
    return 'PENDIENTE';
  }

  return item.attendance.event_type === 'boarded' ? 'REGISTRADO' : item.attendance.event_type.toUpperCase();
}

export function RosterStudentRow({ item }: RosterStudentRowProps) {
  const initials = item.student.nombre_alumno
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View style={styles.row}>
      <Avatar.Text size={44} label={initials || 'AL'} style={styles.avatar} />

      <View style={styles.body}>
        <Text style={styles.name}>{item.student.nombre_alumno}</Text>
        <Text style={styles.stop}>{item.student.direccion ?? 'Sin dirección registrada'}</Text>
        {item.attendance?.scanned_at ? (
          <Text style={styles.meta}>Escaneado: {new Date(item.attendance.scanned_at).toLocaleTimeString()}</Text>
        ) : null}
      </View>

      <Chip compact style={getChipStyles(item.status)} textStyle={styles.chipText}>
        {getChipLabel(item)}
      </Chip>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  stop: {
    color: colors.textMuted,
    fontSize: 12,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 11,
  },
  chipRegistered: {
    backgroundColor: '#0f766e',
  },
  chipPending: {
    backgroundColor: '#991b1b',
  },
  chipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
