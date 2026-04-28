import { Tabs, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { logout } from '@/src/services/auth';
import { colors, fontSize, spacing } from '@/src/theme/theme';

export default function TabsLayout() {
    const router = useRouter();

    async function handleLogout() {
        await logout();
        router.replace('/(auth)/login');
    }

    return (
        <Tabs
            initialRouteName="scan"
            screenOptions={{
                headerStyle: {
                    backgroundColor: colors.background,
                },
                headerShadowVisible: false,
                headerLeft: () => (
                    <View style={styles.headerLeft}>
                        <MaterialCommunityIcons name="bus" size={18} color={colors.primary} />
                        <Text style={styles.headerTitle}>Bus Attendance</Text>
                    </View>
                ),
                headerRight: () => (
                    <TouchableOpacity onPress={handleLogout} style={styles.headerRight}>
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                ),
                headerTitle: () => null,
                tabBarStyle: {
                    backgroundColor: colors.background,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    height: 72,
                    paddingTop: 8,
                    paddingBottom: 8,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarLabelStyle: {
                    fontSize: fontSize.xs,
                    fontWeight: '700',
                    letterSpacing: 0.8,
                },
            }}
        >
            <Tabs.Screen
                name="scan"
                options={{
                    title: 'Iniciar Viaje',
                    tabBarLabel: 'VIAJE',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="bus-clock" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="scan-tab"
                options={{
                    title: 'Escanear QR',
                    tabBarLabel: 'SCAN',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="qrcode-scan" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="roster"
                options={{
                    title: 'Lista de Asistencia',
                    tabBarLabel: 'LISTA',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="format-list-bulleted" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingLeft: spacing.lg,
    },
    headerTitle: {
        color: colors.primary,
        fontWeight: '700',
        fontSize: fontSize.lg,
    },
    headerRight: {
        paddingRight: spacing.lg,
    },
    logoutText: {
        color: colors.textMuted,
        fontSize: fontSize.md,
        fontWeight: '600',
    },
});
