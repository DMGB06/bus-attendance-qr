import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

export type AttendanceBadgeStatus = 'registered' | 'pending';

interface AttendanceBadgeProps {
    status: AttendanceBadgeStatus;
    label?: string;
}

export function AttendanceBadge({ status, label }: AttendanceBadgeProps) {
    const isRegistered = status === 'registered';

    return (
        <View style={[styles.badge, isRegistered ? styles.badgeRegistered : styles.badgePending]}>
            <Text style={styles.badgeText}>{label ?? (isRegistered ? 'REGISTRADO' : 'PENDIENTE')}</Text>
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
    badgeRegistered: {
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
