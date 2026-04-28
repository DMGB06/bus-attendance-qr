import { StyleSheet, View } from 'react-native';
import { Avatar, Button, Text } from 'react-native-paper';

import { AttendanceBadge } from '@/src/components/AttendanceBadge';
import type { TripRosterItem } from '@/src/services/tripRoster';
import { colors, radius, spacing } from '@/src/theme/theme';

interface RosterStudentRowProps {
  item: TripRosterItem;
  onMarkManual?: (studentId: string) => void;
  isMarkingManual?: boolean;
}

function getBadgeLabel(item: TripRosterItem) {
  if (!item.attendance) {
    return 'PENDIENTE';
  }

  if (item.attendance.event_type === 'boarded') {
    return 'ABORDO';
  }

  if (item.attendance.event_type === 'alighted') {
    return 'BAJO';
  }

  return 'MANUAL';
}

export function RosterStudentRow({ item, onMarkManual, isMarkingManual = false }: RosterStudentRowProps) {
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

      <View style={styles.rightColumn}>
        <AttendanceBadge status={item.status} label={getBadgeLabel(item)} />
        {item.status === 'pending' && onMarkManual ? (
          <Button mode="outlined" compact onPress={() => onMarkManual(item.student.id)} loading={isMarkingManual} disabled={isMarkingManual}>
            Manual
          </Button>
        ) : null}
      </View>
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
  rightColumn: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
});
