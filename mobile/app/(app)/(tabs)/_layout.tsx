import { Tabs, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { logout } from '@/src/services/auth';
import { colors, fontSize, spacing } from '@/src/theme/theme';

export default function TabsLayout() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const tabBarBottomPadding = Math.max(insets.bottom, 8);
    const tabBarHeight = 60 + tabBarBottomPadding;

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
                    <TouchableOpacity onPress={handleLogout} style={styles.headerRight} hitSlop={8}>
                        <Text style={styles.logoutText}>Salir</Text>
                    </TouchableOpacity>
                ),
                headerTitle: () => null,
                tabBarStyle: {
                    backgroundColor: colors.background,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    height: tabBarHeight,
                    paddingTop: 8,
                    paddingBottom: tabBarBottomPadding,
                },
                tabBarHideOnKeyboard: true,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarLabelStyle: {
                    fontSize: fontSize.xs,
                    fontWeight: '700',
                    letterSpacing: 0.8,
                },
                tabBarItemStyle: {
                    paddingVertical: 2,
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
        paddingVertical: spacing.xs,
    },
    logoutText: {
        color: colors.textMuted,
        fontSize: fontSize.md,
        fontWeight: '600',
    },
});
