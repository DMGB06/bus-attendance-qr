import { useState } from 'react';

import {
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useRouter } from 'expo-router';

import {
    Button,
    HelperText,
    Text,
} from 'react-native-paper';

import {
    SafeAreaView,
    useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { TripHeader } from '@/src/features/trips/components/TripHeader';

import { startTrip } from '@/src/features/trips/services/trips.service';

import { useTripStore } from '@/src/features/trips/store/tripStore';

import type { TripDirection } from '@/src/features/trips/types';

import { spacing } from '@/src/core/theme/theme';

export default function TripScreen() {
    const router = useRouter();

    const insets = useSafeAreaInsets();

    const { activeTrip, setActiveTrip } = useTripStore();

    const [direction, setDirection] =
        useState<TripDirection>('recojo');

    const [isStartingTrip, setIsStartingTrip] =
        useState(false);

    const [errorMessage, setErrorMessage] =
        useState<string | null>(null);

    async function handleStartTrip() {
        if (activeTrip) return;

        setIsStartingTrip(true);

        setErrorMessage(null);

        try {
            const trip = await startTrip(direction);

            setActiveTrip(trip);
        } catch (error: unknown) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'No se pudo iniciar el viaje.'
            );
        } finally {
            setIsStartingTrip(false);
        }
    }

    return (
        <SafeAreaView
            style={styles.safeArea}
            edges={['bottom', 'left', 'right']}
        >
            <LinearGradient
                colors={[
                    '#0B1020',
                    '#111827',
                    '#0A1222',
                ]}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.glowBlue} />
            <View style={styles.glowPurple} />

            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingBottom:
                            insets.bottom + 12,
                    },
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.container}>

                    <Text style={styles.title}>
                        {activeTrip
                            ? 'Viaje activo'
                            : 'Iniciar viaje'}
                    </Text>

                    <Text style={styles.subtitle}>
                        {activeTrip
                            ? 'Gestiona el recorrido y controla pasajeros.'
                            : 'Selecciona el sentido del recorrido para comenzar.'}
                    </Text>

                    <View style={styles.mainCard}>

                        {!activeTrip ? (
                            <>
                                <View
                                    style={
                                        styles.selectorContainer
                                    }
                                >
                                    <Pressable
                                        style={[
                                            styles.selectorButton,

                                            direction ===
                                            'recojo' &&
                                            styles.selectorButtonActive,
                                        ]}
                                        onPress={() =>
                                            setDirection(
                                                'recojo'
                                            )
                                        }
                                    >
                                        <MaterialCommunityIcons
                                            name="arrow-up"
                                            size={18}
                                            color="#fff"
                                        />

                                        <Text
                                            style={
                                                styles.selectorText
                                            }
                                        >
                                            Recojo
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        style={[
                                            styles.selectorButton,

                                            direction ===
                                            'retorno' &&
                                            styles.selectorButtonActive,
                                        ]}
                                        onPress={() =>
                                            setDirection(
                                                'retorno'
                                            )
                                        }
                                    >
                                        <MaterialCommunityIcons
                                            name="arrow-down"
                                            size={18}
                                            color="#fff"
                                        />

                                        <Text
                                            style={
                                                styles.selectorText
                                            }
                                        >
                                            Retorno
                                        </Text>
                                    </Pressable>
                                </View>

                                <View
                                    style={
                                        styles.infoContainer
                                    }
                                >
                                    <View
                                        style={
                                            styles.infoRow
                                        }
                                    >
                                        <MaterialCommunityIcons
                                            name="bus"
                                            size={18}
                                            color="#60A5FA"
                                        />

                                        <Text
                                            style={
                                                styles.infoText
                                            }
                                        >
                                            Unidad asignada:
                                            BUS-03
                                        </Text>
                                    </View>

                                    <View
                                        style={
                                            styles.infoRow
                                        }
                                    >
                                        <MaterialCommunityIcons
                                            name="account-check"
                                            size={18}
                                            color="#60A5FA"
                                        />

                                        <Text
                                            style={
                                                styles.infoText
                                            }
                                        >
                                            Conductor listo
                                        </Text>
                                    </View>

                                    <View
                                        style={
                                            styles.infoRow
                                        }
                                    >
                                        <MaterialCommunityIcons
                                            name="clock-outline"
                                            size={18}
                                            color="#60A5FA"
                                        />

                                        <Text
                                            style={
                                                styles.infoText
                                            }
                                        >
                                            Sistema operativo
                                        </Text>
                                    </View>
                                </View>

                                {errorMessage ? (
                                    <HelperText
                                        type="error"
                                        visible
                                        style={
                                            styles.errorText
                                        }
                                    >
                                        {
                                            errorMessage
                                        }
                                    </HelperText>
                                ) : null}

                                <LinearGradient
                                    colors={[
                                        '#3B82F6',
                                        '#2563EB',
                                    ]}
                                    start={{
                                        x: 0,
                                        y: 0,
                                    }}
                                    end={{
                                        x: 1,
                                        y: 1,
                                    }}
                                    style={
                                        styles.buttonGradient
                                    }
                                >
                                    <Button
                                        mode="contained"
                                        icon="play"
                                        onPress={
                                            handleStartTrip
                                        }
                                        loading={
                                            isStartingTrip
                                        }
                                        disabled={
                                            isStartingTrip
                                        }
                                        style={
                                            styles.button
                                        }
                                        contentStyle={
                                            styles.buttonContent
                                        }
                                        labelStyle={
                                            styles.buttonLabel
                                        }
                                    >
                                        Iniciar viaje
                                    </Button>
                                </LinearGradient>
                            </>
                        ) : (
                            <>
                                <TripHeader
                                    trip={activeTrip}
                                />

                                <View
                                    style={
                                        styles.activeActions
                                    }
                                >
                                    <Button
                                        mode="contained"
                                        buttonColor="#2563EB"
                                        onPress={() =>
                                            router.push(
                                                '/(tabs)/scanner'
                                            )
                                        }
                                        style={
                                            styles.actionButton
                                        }
                                    >
                                        Ir a scanner
                                    </Button>

                                    <Button
                                        mode="contained-tonal"
                                        onPress={() =>
                                            router.push(
                                                '/(tabs)/roster'
                                            )
                                        }
                                        style={
                                            styles.actionButton
                                        }
                                    >
                                        Ver lista
                                    </Button>

                                    <Button
                                        mode="outlined"
                                        textColor="#E2E8F0"
                                        onPress={() =>
                                            router.push(
                                                '/(tabs)/close-trip'
                                            )
                                        }
                                        style={
                                            styles.actionButton
                                        }
                                    >
                                        Cerrar viaje
                                    </Button>
                                </View>
                            </>
                        )}
                    </View>

                    <View style={styles.warning}>
                        <View
                            style={
                                styles.warningIcon
                            }
                        >
                            <MaterialCommunityIcons
                                name="shield-alert-outline"
                                size={18}
                                color="#FACC15"
                            />
                        </View>

                        <View
                            style={
                                styles.warningText
                            }
                        >
                            <Text
                                style={
                                    styles.warningTitle
                                }
                            >
                                Seguridad
                            </Text>

                            <Text
                                style={
                                    styles.warningBody
                                }
                            >
                                Verifica que todos
                                los estudiantes
                                tengan el cinturón
                                colocado antes de
                                iniciar.
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0B1020',
    },

    glowBlue: {
        position: 'absolute',

        width: 320,
        height: 320,

        borderRadius: 160,

        backgroundColor:
            'rgba(59,130,246,0.15)',

        top: -120,
        right: -120,
    },

    glowPurple: {
        position: 'absolute',

        width: 240,
        height: 240,

        borderRadius: 120,

        backgroundColor:
            'rgba(168,85,247,0.10)',

        bottom: 100,
        left: -80,
    },

    container: {
        flex: 1,

        justifyContent: 'center',

        paddingHorizontal: 24,

        paddingTop: 30,

        gap: 22,
    },

    badge: {
        flexDirection: 'row',

        alignItems: 'center',

        alignSelf: 'center',

        gap: 8,

        paddingHorizontal: 14,
        paddingVertical: 8,

        borderRadius: 999,

        backgroundColor:
            'rgba(59,130,246,0.10)',

        borderWidth: 1,

        borderColor:
            'rgba(255,255,255,0.06)',
    },

    badgeText: {
        color: '#DCE7FF',

        fontSize: 13,

        fontWeight: '600',
    },

    title: {
        color: '#F8FAFC',

        fontSize: 34,

        fontWeight: '800',

        textAlign: 'center',

        letterSpacing: 0.4,
    },

    subtitle: {
        color: '#94A3B8',

        textAlign: 'center',

        fontSize: 15,

        lineHeight: 24,
    },

    mainCard: {
        position: 'relative',

        overflow: 'hidden',

        backgroundColor:
            'rgba(22,28,45,0.88)',

        borderRadius: 32,

        padding: 26,

        gap: 24,

        borderWidth: 1,

        borderColor:
            'rgba(255,255,255,0.06)',

        shadowColor: '#000',

        shadowOpacity: 0.4,

        shadowRadius: 24,

        shadowOffset: {
            width: 0,
            height: 14,
        },

        elevation: 18,
    },


    selectorContainer: {
        flexDirection: 'row',

        backgroundColor:
            'rgba(255,255,255,0.04)',

        padding: 6,

        borderRadius: 20,

        gap: 8,
    },

    selectorButton: {
        flex: 1,

        height: 56,

        borderRadius: 16,

        alignItems: 'center',

        justifyContent: 'center',

        flexDirection: 'row',

        gap: 8,
    },

    selectorButtonActive: {
        backgroundColor: '#2563EB',

        shadowColor: '#2563EB',

        shadowOpacity: 0.35,

        shadowRadius: 12,

        elevation: 10,
    },

    selectorText: {
        color: '#FFFFFF',

        fontWeight: '700',

        fontSize: 15,
    },

    infoContainer: {
        gap: 16,
    },

    infoRow: {
        flexDirection: 'row',

        alignItems: 'center',

        gap: 12,
    },

    infoText: {
        color: '#CBD5E1',

        fontSize: 15,
    },

    buttonGradient: {
        borderRadius: 20,

        overflow: 'hidden',
    },

    button: {
        backgroundColor: 'transparent',
    },

    buttonContent: {
        height: 58,
    },

    buttonLabel: {
        fontSize: 16,

        fontWeight: '700',
    },

    errorText: {
        marginTop: -10,
    },

    activeActions: {
        gap: spacing.sm,
    },

    actionButton: {
        borderRadius: 16,
    },

    warning: {
        flexDirection: 'row',

        alignItems: 'flex-start',

        gap: 14,

        backgroundColor:
            'rgba(245,158,11,0.08)',

        borderRadius: 22,

        borderWidth: 1,

        borderColor:
            'rgba(245,158,11,0.14)',

        padding: 18,
    },

    warningIcon: {
        width: 38,
        height: 38,

        borderRadius: 19,

        alignItems: 'center',

        justifyContent: 'center',

        backgroundColor:
            'rgba(245,158,11,0.12)',
    },

    warningText: {
        flex: 1,

        gap: 6,
    },

    warningTitle: {
        color: '#FCD34D',

        fontSize: 15,

        fontWeight: '700',
    },

    warningBody: {
        color: '#CBD5E1',

        fontSize: 14,

        lineHeight: 22,
    },
    scrollContent: {
        gap: 22,
        paddingBottom: 20
    },
});