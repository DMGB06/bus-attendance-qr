import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button, HelperText, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TripHeader } from '@/src/features/trips/components/TripHeader';
import { startTrip } from '@/src/features/trips/services/trips.service';
import { rosterStoreActions } from '@/src/features/trips/store/rosterStore';
import { useTripStore } from '@/src/features/trips/store/tripStore';
import { getErrorMessage } from '@/src/shared/utils/errors';
import type { TripDirection } from '@/src/features/trips/types';
import { useAppTheme } from '@/src/core/theme/ThemeProvider';
import { AppScrollView } from '@/src/shared/ui/AppScrollView';

export default function TripScreen() {
  const router = useRouter();
  const { activeTrip, setActiveTrip } = useTripStore();
  const { colors, tokens } = useAppTheme();
  const [direction, setDirection] = useState<TripDirection>('recojo');
  const [isStartingTrip, setIsStartingTrip] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: colors.screenSolid,
        },
        container: {
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.xl,
          gap: tokens.spacing.xl,
          maxWidth: 480,
          width: '100%',
          alignSelf: 'center',
        },
        pageHeader: {
          alignItems: 'center',
          gap: tokens.spacing.sm,
        },
        title: {
          ...tokens.typography.title1,
          color: colors.textHero,
          textAlign: 'center',
        },
        subtitle: {
          ...tokens.typography.body,
          color: colors.textMuted,
          textAlign: 'center',
        },
        mainCard: {
          backgroundColor: colors.surfaceCard,
          borderRadius: tokens.radius.lg,
          padding: tokens.spacing.xl,
          gap: tokens.spacing.lg,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          borderTopWidth: 4,
          borderTopColor: colors.accent,
        },
        selectorContainer: {
          flexDirection: 'row',
          backgroundColor: colors.surfaceTrack,
          padding: tokens.spacing.xs,
          borderRadius: tokens.radius.md,
          gap: tokens.spacing.xs,
        },
        selectorButton: {
          flex: 1,
          height: tokens.layout.buttonHeight,
          borderRadius: tokens.radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.sm,
        },
        selectorButtonActive: {
          backgroundColor: colors.primary,
        },
        selectorText: {
          ...tokens.typography.bodyStrong,
        },
        selectorLabelActive: {
          color: colors.textInverse,
        },
        selectorLabelIdle: {
          color: colors.tripSelectorIdleText,
        },
        infoContainer: {
          gap: tokens.spacing.md,
          paddingTop: tokens.spacing.xs,
          borderTopWidth: 1,
          borderTopColor: colors.borderMuted,
        },
        infoRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.spacing.sm,
        },
        infoText: {
          ...tokens.typography.body,
          color: colors.textBody,
        },
        startButton: {
          borderRadius: tokens.radius.md,
        },
        startButtonContent: {
          height: tokens.layout.buttonHeight,
        },
        startButtonLabel: {
          ...tokens.typography.bodyStrong,
          color: colors.textOnPrimary,
        },
        errorText: {
          marginTop: -tokens.spacing.sm,
        },
        activeActions: {
          gap: tokens.spacing.md,
        },
        actionButton: {
          borderRadius: tokens.radius.md,
        },
        actionButtonContent: {
          height: tokens.layout.buttonHeight - 4,
        },
        warning: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: tokens.spacing.md,
          backgroundColor: colors.skySoftBg,
          borderRadius: tokens.radius.md,
          borderWidth: 1,
          borderColor: colors.feedbackWarningBorder,
          padding: tokens.spacing.lg,
        },
        warningIcon: {
          width: 36,
          height: 36,
          borderRadius: tokens.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.feedbackWarningIconCircle,
        },
        warningText: {
          flex: 1,
          gap: tokens.spacing.xs,
        },
        warningTitle: {
          ...tokens.typography.label,
          color: colors.feedbackWarningTitle,
        },
        warningBody: {
          ...tokens.typography.body,
          color: colors.feedbackWarningBody,
        },
        scrollContent: {
          gap: tokens.spacing.lg,
        },
      }),
    [colors, tokens],
  );

  async function handleStartTrip() {
    if (activeTrip) return;

    setIsStartingTrip(true);
    setErrorMessage(null);

    try {
      const trip = await startTrip(direction);
      setActiveTrip(trip);
      void rosterStoreActions.hydrateTripRoster(trip.id);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'No se pudo iniciar el viaje.'));
    } finally {
      setIsStartingTrip(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <AppScrollView
        extraBottomInset={tokens.spacing.md}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.pageHeader}>
            <Text style={styles.title}>{activeTrip ? 'Viaje en curso' : 'Iniciar viaje'}</Text>
            <Text style={styles.subtitle}>
              {activeTrip
                ? 'Gestiona el recorrido y controla pasajeros.'
                : 'Selecciona el sentido del recorrido para comenzar.'}
            </Text>
          </View>

          <View style={styles.mainCard}>
            {!activeTrip ? (
              <>
                <View style={styles.selectorContainer}>
                  <Pressable
                    style={[styles.selectorButton, direction === 'recojo' && styles.selectorButtonActive]}
                    onPress={() => setDirection('recojo')}
                  >
                    <MaterialCommunityIcons
                      name="arrow-up-bold"
                      size={16}
                      color={direction === 'recojo' ? colors.textInverse : colors.tripSelectorIdleText}
                    />
                    <Text
                      style={[
                        styles.selectorText,
                        direction === 'recojo' ? styles.selectorLabelActive : styles.selectorLabelIdle,
                      ]}
                    >
                      Recojo
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.selectorButton, direction === 'retorno' && styles.selectorButtonActive]}
                    onPress={() => setDirection('retorno')}
                  >
                    <MaterialCommunityIcons
                      name="arrow-down-bold"
                      size={16}
                      color={direction === 'retorno' ? colors.textInverse : colors.tripSelectorIdleText}
                    />
                    <Text
                      style={[
                        styles.selectorText,
                        direction === 'retorno' ? styles.selectorLabelActive : styles.selectorLabelIdle,
                      ]}
                    >
                      Retorno
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.infoContainer}>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="bus" size={18} color={colors.sky} />
                    <Text style={styles.infoText}>Unidad asignada: BUS-03</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="account-check" size={18} color={colors.sky} />
                    <Text style={styles.infoText}>Conductor listo</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color={colors.sky} />
                    <Text style={styles.infoText}>Sistema operativo</Text>
                  </View>
                </View>

                {errorMessage ? (
                  <HelperText type="error" visible style={styles.errorText}>
                    {errorMessage}
                  </HelperText>
                ) : null}

                <Button
                  mode="contained"
                  icon="play"
                  onPress={handleStartTrip}
                  loading={isStartingTrip}
                  disabled={isStartingTrip}
                  style={styles.startButton}
                  contentStyle={styles.startButtonContent}
                  labelStyle={styles.startButtonLabel}
                  buttonColor={colors.primary}
                >
                  Iniciar viaje
                </Button>
              </>
            ) : (
              <>
                <TripHeader trip={activeTrip} />

                <View style={styles.activeActions}>
                  <Button
                    mode="contained"
                    buttonColor={colors.primary}
                    onPress={() => router.push('/(tabs)/scanner')}
                    style={styles.actionButton}
                    contentStyle={styles.actionButtonContent}
                    labelStyle={styles.startButtonLabel}
                  >
                    Ir a escáner
                  </Button>

                  <Button
                    mode="outlined"
                    textColor={colors.primary}
                    onPress={() => router.push('/(tabs)/roster')}
                    style={styles.actionButton}
                    contentStyle={styles.actionButtonContent}
                  >
                    Ver lista
                  </Button>

                  <Button
                    mode="text"
                    textColor={colors.tripActionOutlineText}
                    onPress={() => router.push('/(tabs)/close-trip')}
                    style={styles.actionButton}
                  >
                    Cerrar viaje
                  </Button>
                </View>
              </>
            )}
          </View>

          <View style={styles.warning}>
            <View style={styles.warningIcon}>
              <MaterialCommunityIcons name="shield-alert-outline" size={20} color={colors.feedbackWarningGlyph} />
            </View>
            <View style={styles.warningText}>
              <Text style={styles.warningTitle}>Seguridad</Text>
              <Text style={styles.warningBody}>
                Verifica que todos los estudiantes tengan el cinturón colocado antes de iniciar.
              </Text>
            </View>
          </View>
        </View>
      </AppScrollView>
    </SafeAreaView>
  );
}
