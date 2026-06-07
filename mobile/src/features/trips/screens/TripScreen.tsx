import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button, HelperText, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TripHeader } from '@/src/features/trips/components/TripHeader';
import { startTrip } from '@/src/features/trips/services/trips.service';
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
          paddingHorizontal: tokens.spacing.xl,
          paddingTop: tokens.spacing['2xl'],
          gap: tokens.spacing.xl,
        },
        title: {
          ...tokens.typography.display,
          color: colors.textHero,
          textAlign: 'center',
        },
        subtitle: {
          ...tokens.typography.body,
          color: colors.textMuted,
          textAlign: 'center',
          marginTop: tokens.spacing.sm,
        },
        mainCard: {
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: colors.surfaceGlass,
          borderRadius: tokens.radius['2xl'],
          padding: tokens.spacing.xl,
          gap: tokens.spacing.xl,
          borderWidth: 1,
          borderColor: colors.surfaceGlassBorder,
          shadowColor: colors.shadowColor,
          shadowOpacity: 0.2,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 14 },
          elevation: 18,
        },
        selectorContainer: {
          flexDirection: 'row',
          backgroundColor: colors.surfaceTrack,
          padding: tokens.spacing.xs,
          borderRadius: tokens.radius.lg,
          gap: tokens.spacing.sm,
        },
        selectorButton: {
          flex: 1,
          height: 56,
          borderRadius: tokens.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.sm,
        },
        selectorButtonActive: {
          backgroundColor: colors.primaryPressed,
          shadowColor: colors.primaryPressed,
          shadowOpacity: 0.35,
          shadowRadius: 12,
          elevation: 10,
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
          gap: tokens.spacing.lg,
        },
        infoRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.spacing.md,
        },
        infoText: {
          ...tokens.typography.body,
          color: colors.textBody,
        },
        buttonGradient: {
          borderRadius: tokens.radius.lg,
          overflow: 'hidden',
        },
        button: {
          backgroundColor: 'transparent',
        },
        buttonContent: {
          height: 58,
        },
        buttonLabel: {
          ...tokens.typography.headline,
          color: colors.textOnPrimary,
        },
        errorText: {
          marginTop: -10,
        },
        activeActions: {
          gap: tokens.spacing.sm,
        },
        actionButton: {
          borderRadius: tokens.radius.md,
        },
        warning: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: tokens.spacing.md,
          backgroundColor: colors.feedbackWarningBg,
          borderRadius: tokens.radius.xl,
          borderWidth: 1,
          borderColor: colors.feedbackWarningBorder,
          padding: tokens.spacing.lg,
        },
        warningIcon: {
          width: 38,
          height: 38,
          borderRadius: tokens.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.feedbackWarningIconCircle,
        },
        warningText: {
          flex: 1,
          gap: 6,
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
          gap: tokens.spacing.xl,
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
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'No se pudo iniciar el viaje.'));
    } finally {
      setIsStartingTrip(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <LinearGradient colors={colors.screenGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

      <AppScrollView
        extraBottomInset={tokens.spacing.md}
        contentContainerStyle={[styles.scrollContent]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <Text style={styles.title}>{activeTrip ? 'Viaje activo' : 'Iniciar viaje'}</Text>

          <Text style={styles.subtitle}>
            {activeTrip
              ? 'Gestiona el recorrido y controla pasajeros.'
              : 'Selecciona el sentido del recorrido para comenzar.'}
          </Text>

          <View style={styles.mainCard}>
            {!activeTrip ? (
              <>
                <View style={styles.selectorContainer}>
                  <Pressable
                    style={[styles.selectorButton, direction === 'recojo' && styles.selectorButtonActive]}
                    onPress={() => setDirection('recojo')}
                  >
                    <MaterialCommunityIcons
                      name="arrow-up"
                      size={18}
                      color={direction === 'recojo' ? colors.textInverse : colors.tripSelectorIdleText}
                    />
                    <Text style={[styles.selectorText, direction === 'recojo' ? styles.selectorLabelActive : styles.selectorLabelIdle]}>
                      Recojo
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.selectorButton, direction === 'retorno' && styles.selectorButtonActive]}
                    onPress={() => setDirection('retorno')}
                  >
                    <MaterialCommunityIcons
                      name="arrow-down"
                      size={18}
                      color={direction === 'retorno' ? colors.textInverse : colors.tripSelectorIdleText}
                    />
                    <Text style={[styles.selectorText, direction === 'retorno' ? styles.selectorLabelActive : styles.selectorLabelIdle]}>
                      Retorno
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.infoContainer}>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="bus" size={18} color={colors.primarySoftText} />
                    <Text style={styles.infoText}>Unidad asignada: BUS-03</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="account-check" size={18} color={colors.primarySoftText} />
                    <Text style={styles.infoText}>Conductor listo</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color={colors.primarySoftText} />
                    <Text style={styles.infoText}>Sistema operativo</Text>
                  </View>
                </View>

                {errorMessage ? (
                  <HelperText type="error" visible style={styles.errorText}>
                    {errorMessage}
                  </HelperText>
                ) : null}

                <LinearGradient colors={colors.ctaGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.buttonGradient}>
                  <Button
                    mode="contained"
                    icon="play"
                    onPress={handleStartTrip}
                    loading={isStartingTrip}
                    disabled={isStartingTrip}
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                    labelStyle={styles.buttonLabel}
                    buttonColor="transparent"
                  >
                    Iniciar viaje
                  </Button>
                </LinearGradient>
              </>
            ) : (
              <>
                <TripHeader trip={activeTrip} />

                <View style={styles.activeActions}>
                  <Button
                    mode="contained"
                    buttonColor={colors.primaryPressed}
                    onPress={() => router.push('/(tabs)/scanner')}
                    style={styles.actionButton}
                  >
                    Ir a scanner
                  </Button>

                  <Button mode="contained-tonal" onPress={() => router.push('/(tabs)/roster')} style={styles.actionButton}>
                    Ver lista
                  </Button>

                  <Button
                    mode="outlined"
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
              <MaterialCommunityIcons name="shield-alert-outline" size={18} color={colors.feedbackWarningGlyph} />
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
