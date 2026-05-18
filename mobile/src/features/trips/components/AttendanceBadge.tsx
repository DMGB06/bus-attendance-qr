import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useAppTheme } from '@/src/core/theme/ThemeProvider';

export type AttendanceBadgeStatus = 'pending' | 'onboard' | 'completed';

interface AttendanceBadgeProps {
  status: AttendanceBadgeStatus;
  label?: string;
}

export function AttendanceBadge({ status, label }: AttendanceBadgeProps) {
  const { colors } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        badge: {
          minWidth: 88,
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 6,
          alignItems: 'center',
        },
        badgeOnboard: {
          backgroundColor: colors.attendanceOnboard,
        },
        badgeCompleted: {
          backgroundColor: colors.attendanceCompleted,
        },
        badgePending: {
          backgroundColor: colors.attendancePending,
        },
        badgeText: {
          color: colors.attendanceLabel,
          fontSize: 11,
          fontWeight: '700',
        },
      }),
    [colors],
  );

  const variantStyle =
    status === 'completed' ? styles.badgeCompleted : status === 'onboard' ? styles.badgeOnboard : styles.badgePending;

  const defaultLabel =
    status === 'completed' ? 'SALIDA' : status === 'onboard' ? 'ABORDO' : 'PENDIENTE';

  return (
    <View style={[styles.badge, variantStyle]}>
      <Text style={styles.badgeText}>{label ?? defaultLabel}</Text>
    </View>
  );
}
