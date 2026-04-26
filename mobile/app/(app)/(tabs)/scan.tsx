import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { createTrip } from '@/src/services/trips';
import { useTripStore } from '@/src/stores/tripStore';
import type { TripDirection } from '@/src/types';
import { colors, fontSize, radius, spacing } from '@/src/theme/theme';

export default function ScanScreen() {
    const router = useRouter();
    const { activeTrip, setActiveTrip } = useTripStore();
    const [direction, setDirection] = useState<TripDirection>('ida');
    const [isStartingTrip, setIsStartingTrip] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function handleStartTrip() {
        if (activeTrip) {
            return;
        }

        setIsStartingTrip(true);
        setErrorMessage(null);

        try {
            const trip = await createTrip(direction);
            setActiveTrip(trip);
        } catch (error: unknown) {
            setErrorMessage(error instanceof Error ? error.message : 'No se pudo iniciar el viaje.');
        } finally {
            setIsStartingTrip(false);
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{activeTrip ? 'Viaje activo' : 'Iniciar Viaje'}</Text>
                <Text style={styles.subtitle}>
                    {activeTrip ? 'Ya puedes escanear y revisar la lista' : 'Selecciona el sentido del viaje'}
                </Text>
            </View>

            {!activeTrip ? (
                <View style={styles.cards}>
                    <Pressable
                        style={[styles.card, direction === 'ida' && styles.cardActive]}
                        onPress={() => setDirection('ida')}
                    >
                        <View
                            style={[
                                styles.iconCircle,
                                { backgroundColor: direction === 'ida' ? colors.primary : colors.surfaceLight },
                            ]}
                        >
                            <MaterialCommunityIcons
                                name="arrow-up"
                                size={24}
                                color={direction === 'ida' ? '#fff' : colors.textMuted}
                            />
                        </View>

                        <View style={styles.cardText}>
                            <Text style={[styles.cardTitle, { color: direction === 'ida' ? colors.textPrimary : colors.textMuted }]}>
                                IDA
                            </Text>
                            <Text style={styles.cardSubtitle}>Hacia el establecimiento</Text>
                        </View>

                        <View style={[styles.radioOuter, direction === 'ida' && styles.radioOuterActive]}>
                            {direction === 'ida' ? <MaterialCommunityIcons name="check" size={12} color="#fff" /> : null}
                        </View>
                    </Pressable>

                    <Pressable
                        style={[styles.card, direction === 'vuelta' && styles.cardActive]}
                        onPress={() => setDirection('vuelta')}
                    >
                        <View
                            style={[
                                styles.iconCircle,
                                { backgroundColor: direction === 'vuelta' ? colors.primary : colors.surfaceLight },
                            ]}
                        >
                            <MaterialCommunityIcons
                                name="arrow-down"
                                size={24}
                                color={direction === 'vuelta' ? '#fff' : colors.textMuted}
                            />
                        </View>

                        <View style={styles.cardText}>
                            <Text
                                style={[styles.cardTitle, { color: direction === 'vuelta' ? colors.textPrimary : colors.textMuted }]}
                            >
                                VUELTA
                            </Text>
                            <Text style={styles.cardSubtitle}>Hacia los domicilios</Text>
                        </View>

                        <View style={[styles.radioOuter, direction === 'vuelta' && styles.radioOuterActive]}>
                            {direction === 'vuelta' ? <MaterialCommunityIcons name="check" size={12} color="#fff" /> : null}
                        </View>
                    </Pressable>
                </View>
            ) : (
                <View style={styles.activeTripCard}>
                    <MaterialCommunityIcons name="bus-clock" size={28} color={colors.primary} />
                    <Text style={styles.activeTripTitle}>Viaje {activeTrip.direction.toUpperCase()}</Text>
                    <Text style={styles.activeTripBody}>Inicio: {new Date(activeTrip.started_at).toLocaleTimeString()}</Text>

                    <View style={styles.activeActions}>
                        <Button mode="contained" onPress={() => router.push('/(app)/(tabs)/scan-tab')}>
                            Ir a scanner
                        </Button>
                        <Button mode="contained-tonal" onPress={() => router.push('/(app)/(tabs)/roster')}>
                            Ver lista
                        </Button>
                        <Button mode="outlined" onPress={() => router.push('/(app)/close-trip')}>
                            Cerrar viaje
                        </Button>
                    </View>
                </View>
            )}

            {!activeTrip ? (
                <>
                    {errorMessage ? <HelperText type="error">{errorMessage}</HelperText> : null}
                    <Button
                        mode="contained"
                        style={styles.primaryButton}
                        contentStyle={styles.primaryButtonContent}
                        icon="arrow-right"
                        onPress={handleStartTrip}
                        loading={isStartingTrip}
                        disabled={isStartingTrip}
                    >
                        Iniciar viaje
                    </Button>
                </>
            ) : null}

            <View style={styles.warning}>
                <MaterialCommunityIcons name="alert-outline" size={16} color="#f59e0b" style={{ marginTop: 2 }} />
                <View style={styles.warningText}>
                    <Text style={styles.warningTitle}>Recordatorio de Seguridad</Text>
                    <Text style={styles.warningBody}>
                        Asegúrate de que todos los pasajeros tengan el cinturón puesto antes de iniciar.
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.lg,
        gap: spacing.lg,
    },
    header: {
        gap: spacing.xs,
        marginTop: spacing.sm,
    },
    title: {
        color: colors.textPrimary,
        fontSize: fontSize.xl,
        fontWeight: '700',
        textAlign: 'center',
    },
    subtitle: {
        color: colors.textMuted,
        fontSize: fontSize.md,
        textAlign: 'center',
    },
    cards: {
        gap: spacing.md,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardActive: {
        borderColor: colors.primary,
        borderWidth: 2,
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardText: {
        flex: 1,
        gap: 3,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 1,
    },
    cardSubtitle: {
        color: colors.textMuted,
        fontSize: fontSize.sm,
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceLight,
    },
    radioOuterActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    primaryButton: {
        borderRadius: radius.md,
    },
    primaryButtonContent: {
        paddingVertical: 6,
        flexDirection: 'row-reverse',
    },
    activeTripCard: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: spacing.lg,
        gap: spacing.xs,
    },
    activeTripTitle: {
        color: colors.textPrimary,
        fontSize: 22,
        fontWeight: '700',
    },
    activeTripBody: {
        color: colors.textMuted,
        fontSize: fontSize.sm,
    },
    activeActions: {
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    warning: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        gap: spacing.sm,
        alignItems: 'flex-start',
        borderLeftWidth: 3,
        borderLeftColor: '#f59e0b',
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
    },
    warningText: {
        flex: 1,
        gap: spacing.xs,
    },
    warningTitle: {
        color: '#fcd34d',
        fontWeight: '700',
        fontSize: fontSize.md,
    },
    warningBody: {
        color: colors.textMuted,
        fontSize: fontSize.sm,
        lineHeight: 18,
    },
});
