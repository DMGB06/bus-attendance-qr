import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { TripHeader } from '@/src/features/trips/components/TripHeader';
import { startTrip } from '@/src/features/trips/services/trips.service';
import { useTripStore } from '@/src/features/trips/store/tripStore';
import type { TripDirection } from '@/src/features/trips/types';
import { colors, fontSize, radius, spacing } from '@/src/core/theme/theme';

const DIRECTION_OPTIONS: Array<{
    value: TripDirection;
    title: string;
    subtitle: string;
    icon: 'arrow-up' | 'arrow-down';
}> = [
        {
            value: 'ida',
            title: 'IDA',
            subtitle: 'Hacia el establecimiento',
            icon: 'arrow-up',
        },
        {
            value: 'vuelta',
            title: 'VUELTA',
            subtitle: 'Hacia los domicilios',
            icon: 'arrow-down',
        },
    ];

export default function TripScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { activeTrip, setActiveTrip } = useTripStore();
    const [direction, setDirection] = useState<TripDirection>('ida');
    const [isStartingTrip, setIsStartingTrip] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const scrollBottomPadding = activeTrip ? insets.bottom + spacing.lg : insets.bottom + 132;

    async function handleStartTrip() {
        if (activeTrip) {
            return;
        }

        setIsStartingTrip(true);
        setErrorMessage(null);

        try {
            const trip = await startTrip(direction);
            setActiveTrip(trip);
        } catch (error: unknown) {
            setErrorMessage(error instanceof Error ? error.message : 'No se pudo iniciar el viaje.');
        } finally {
            setIsStartingTrip(false);
        }
    }

    return (
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>
            <View style={styles.root}>
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>{activeTrip ? 'Viaje activo' : 'Iniciar viaje'}</Text>
                        <Text style={styles.subtitle}>
                            {activeTrip ? 'Ya puedes escanear y revisar la lista' : 'Selecciona el sentido del viaje'}
                        </Text>
                    </View>

                    {!activeTrip ? (
                        <View style={styles.cards}>
                            {DIRECTION_OPTIONS.map((option) => {
                                const isSelected = direction === option.value;

                                return (
                                    <Pressable
                                        key={option.value}
                                        style={[styles.tripCard, isSelected && styles.tripCardActive]}
                                        onPress={() => setDirection(option.value)}
                                    >
                                        <View style={[styles.cardOrb, isSelected && styles.cardOrbActive]} pointerEvents="none" />

                                        <View style={styles.tripCardTop}>
                                            <View style={[styles.iconCircle, isSelected && styles.iconCircleActive]}>
                                                <MaterialCommunityIcons
                                                    name={option.icon}
                                                    size={22}
                                                    color={isSelected ? '#ffffff' : '#a9b3d3'}
                                                />
                                            </View>

                                            <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                                                {isSelected ? <MaterialCommunityIcons name="check" size={12} color="#ffffff" /> : null}
                                            </View>
                                        </View>

                                        <Text style={[styles.cardTitle, !isSelected && styles.cardTitleMuted]}>{option.title}</Text>
                                        <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    ) : (
                        <View style={styles.activeTripCard}>
                            <TripHeader trip={activeTrip} />

                            <View style={styles.activeActions}>
                                <Button mode="contained" onPress={() => router.push('/(tabs)/scanner')}>
                                    Ir a scanner
                                </Button>
                                <Button mode="contained-tonal" onPress={() => router.push('/(tabs)/roster')}>
                                    Ver lista
                                </Button>
                                <Button mode="outlined" onPress={() => router.push('/(tabs)/close-trip')}>
                                    Cerrar viaje
                                </Button>
                            </View>
                        </View>
                    )}

                    <View style={styles.warning}>
                        <MaterialCommunityIcons name="alert-outline" size={16} color="#f59e0b" style={{ marginTop: 2 }} />
                        <View style={styles.warningText}>
                            <Text style={styles.warningTitle}>Recordatorio de Seguridad</Text>
                            <Text style={styles.warningBody}>
                                Asegúrate de que todos los pasajeros tengan el cinturón puesto antes de iniciar.
                            </Text>
                        </View>
                    </View>
                </ScrollView>

                {!activeTrip ? (
                    <View style={[styles.ctaDock, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
                        {errorMessage ? <HelperText type="error">{errorMessage}</HelperText> : null}
                        <Button
                            mode="contained"
                            style={styles.ctaButton}
                            contentStyle={styles.ctaButtonContent}
                            labelStyle={styles.ctaButtonLabel}
                            icon="plus"
                            onPress={handleStartTrip}
                            loading={isStartingTrip}
                            disabled={isStartingTrip}
                        >
                            Iniciar viaje
                        </Button>
                    </View>
                ) : null}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0a1026',
    },
    root: {
        flex: 1,
        backgroundColor: '#0a1026',
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        gap: spacing.md,
    },
    header: {
        gap: spacing.xs,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 30,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    subtitle: {
        color: '#9aa3c7',
        fontSize: fontSize.md,
        textAlign: 'center',
    },
    cards: {
        gap: spacing.md,
        marginTop: spacing.sm,
    },
    tripCard: {
        backgroundColor: '#252b52',
        borderRadius: 22,
        padding: spacing.lg,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(143, 160, 255, 0.18)',
        overflow: 'hidden',
        minHeight: 150,
    },
    tripCardActive: {
        borderColor: '#4c6fff',
        borderWidth: 2,
    },
    cardOrb: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        right: -68,
        top: -24,
        backgroundColor: 'rgba(63, 101, 244, 0.24)',
    },
    cardOrbActive: {
        backgroundColor: 'rgba(63, 101, 244, 0.44)',
    },
    tripCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    iconCircle: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3d4a6b',
    },
    iconCircleActive: {
        backgroundColor: '#3168ff',
    },
    cardTitle: {
        color: colors.textPrimary,
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: 1,
    },
    cardTitleMuted: {
        color: '#d1d7ef',
    },
    cardSubtitle: {
        color: '#adb7d9',
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
        backgroundColor: '#3168ff',
        borderColor: '#3168ff',
    },
    ctaDock: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: spacing.lg,
        backgroundColor: '#0a1026',
    },
    ctaButton: {
        borderRadius: radius.lg,
        backgroundColor: '#0f6bff',
    },
    ctaButtonContent: {
        height: 50,
        flexDirection: 'row-reverse',
    },
    ctaButtonLabel: {
        fontSize: 16,
        fontWeight: '700',
    },
    activeTripCard: {
        gap: spacing.md,
        backgroundColor: '#252b52',
        borderRadius: radius.xl + 2,
        borderWidth: 1,
        borderColor: 'rgba(143, 160, 255, 0.2)',
        padding: spacing.md,
        marginTop: spacing.sm,
    },
    activeActions: {
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    warning: {
        flexDirection: 'row',
        backgroundColor: 'rgba(45, 52, 73, 0.65)',
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
        color: '#b8c0de',
        fontSize: fontSize.sm,
        lineHeight: 18,
    },
});
