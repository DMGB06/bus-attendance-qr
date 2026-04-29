import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

export type AttendanceBadgeStatus = 'pending' | 'onboard' | 'completed';

interface AttendanceBadgeProps {
    status: AttendanceBadgeStatus;
    label?: string;
}

export function AttendanceBadge({ status, label }: AttendanceBadgeProps) {
    const variantStyle =
        status === 'completed'
            ? styles.badgeCompleted
            : status === 'onboard'
                ? styles.badgeOnboard
                : styles.badgePending;

    const defaultLabel =
        status === 'completed'
            ? 'SALIDA'
            : status === 'onboard'
                ? 'ABORDO'
                : 'PENDIENTE';

    return (
        <View style={[styles.badge, variantStyle]}>
            <Text style={styles.badgeText}>{label ?? defaultLabel}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        minWidth: 88,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        alignItems: 'center',
    },
    badgeOnboard: {
        backgroundColor: '#1d4ed8',
    },
    badgeCompleted: {
        backgroundColor: '#166534',
    },
    badgePending: {
        backgroundColor: '#b91c1c',
    },
    badgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
});
