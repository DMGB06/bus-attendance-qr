import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button, HelperText, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OPS_ROUTES } from '@/src/core/routes';
import { useAppCapabilities } from '@/src/features/auth/hooks/useAppCapabilities';
import { MorningRiderReminderBanner } from '@/src/features/trips/components/MorningRiderReminderBanner';
import {
  AFTERNOON_TURN_OPTIONS,
  type AfternoonTurnType,
} from '@/src/features/trips/domain/trip-turn';
import {
  formatTripTitle,
  getSuggestedLevelFilterHint,
  getTripDashboardStatLabels,
  getTripSegmentSubtitle,
} from '@/src/features/trips/domain/trip-labels';
import { useMorningRiderSummary } from '@/src/features/trips/hooks/useMorningRiderSummary';
import { WaitingForDriverView } from '@/src/features/trips/components/WaitingForDriverView';
import { TripDailyChecklist } from '@/src/features/trips/components/TripDailyChecklist';
import type { DailyChecklistContext } from '@/src/features/trips/domain/trip-daily-checklist';
import { useTripDashboard } from '@/src/features/trips/hooks/useTripDashboard';
import { createTripScreenStyles } from '@/src/features/trips/screens/tripScreen.styles';
import {
  getOperationalContext,
  startTrip,
} from '@/src/features/trips/services/trips.service';
import type { OperationalBusContext } from '@/src/features/trips/services/crew.service';
import { useRosterItems } from '@/src/features/trips/store/rosterStore';
import { useTripStore } from '@/src/features/trips/store/tripStore';
import { requestRosterView } from '@/src/features/trips/utils/roster-navigation';
import { getErrorMessage } from '@/src/shared/utils/errors';
import type { TurnType } from '@/src/features/trips/types';
import { useAppTheme } from '@/src/core/theme/ThemeProvider';
import { AppScrollView } from '@/src/shared/ui/AppScrollView';
import { useCompactScreen } from '@/src/shared/hooks/useCompactScreen';
import { useScreenPerfMark } from '@/src/shared/hooks/useScreenPerfMark';

type TripPeriod = 'mañana' | 'tarde';

export default function TripScreen() {
  const router = useRouter();
  useScreenPerfMark('trip');
  const { activeTrip, setActiveTrip } = useTripStore();
  const { capabilities } = useAppCapabilities();
  const dashboard = useTripDashboard(activeTrip);
  const rosterItems = useRosterItems(activeTrip?.id);
  const [period, setPeriod] = useState<TripPeriod>('mañana');
  const [afternoonTurn, setAfternoonTurn] = useState<AfternoonTurnType>('tarde_primaria');
  const morningRiders = useMorningRiderSummary(
    activeTrip?.trip_date,
    activeTrip?.direction,
    rosterItems,
  );
  const dashboardStatLabels = useMemo(
    () => getTripDashboardStatLabels(activeTrip?.direction ?? 'recojo'),
    [activeTrip?.direction],
  );
  const checklistContext = useMemo((): DailyChecklistContext => {
    if (!activeTrip) {
      return {
        hasActiveTrip: false,
        direction: null,
        onboardCount: 0,
        pendingCount: 0,
        completedCount: 0,
        morningRiderPendingCount: 0,
        setupPeriod: period,
      };
    }

    return {
      hasActiveTrip: true,
      direction: activeTrip.direction,
      onboardCount: dashboard.stats.onboardCount,
      pendingCount: dashboard.stats.pendingCount,
      completedCount: dashboard.stats.completedCount,
      morningRiderPendingCount: morningRiders.count,
    };
  }, [
    activeTrip,
    dashboard.stats.completedCount,
    dashboard.stats.onboardCount,
    dashboard.stats.pendingCount,
    morningRiders.count,
    period,
  ]);
  const { colors, tokens } = useAppTheme();
  const [isStartingTrip, setIsStartingTrip] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [operationalContext, setOperationalContext] = useState<
    OperationalBusContext | null | undefined
  >(undefined);

  const { isCompact } = useCompactScreen();
  const styles = useMemo(
    () => createTripScreenStyles(colors, tokens, isCompact),
    [colors, isCompact, tokens],
  );

  const historyFooter = capabilities.canViewRoster ? (
    <Button
      mode="outlined"
      icon="history"
      textColor={colors.primary}
      onPress={() => router.push(OPS_ROUTES.activity)}
      style={styles.historyButton}
      contentStyle={styles.actionButtonContent}
    >
      Ver historial (7 días)
    </Button>
  ) : null;

  useEffect(() => {
    void getOperationalContext().then((context) => {
      setOperationalContext(context);
    });
  }, []);

  function getSelectedTurnType(): TurnType {
    return period === 'mañana' ? 'mañana' : afternoonTurn;
  }

  async function handleStartTrip() {
    if (activeTrip || !capabilities.canStartTrip) return;

    setIsStartingTrip(true);
    setErrorMessage(null);

    try {
      const trip = await startTrip(getSelectedTurnType());
      setActiveTrip(trip);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'No se pudo iniciar el viaje.'));
    } finally {
      setIsStartingTrip(false);
    }
  }

  const activeTripMeta = activeTrip?.started_at
    ? new Date(activeTrip.started_at).toLocaleString('es-PE', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  if (capabilities.isAssistant && !activeTrip) {
    if (operationalContext === undefined) {
      return null;
    }

    if (!operationalContext) {
      return (
        <WaitingForDriverView
          busLabel={null}
          isRefreshing={false}
          title="Sin bus asignado"
          body="No tienes una unidad asignada para hoy. Pide al coordinador que te registre en BUS-01."
          footer={historyFooter}
        />
      );
    }

    return (
      <WaitingForDriverView
        busLabel={operationalContext.busLabel}
        footer={historyFooter}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <AppScrollView
        extraBottomInset={tokens.spacing.lg}
        contentGrow={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.pageHeader}>
            <Text style={styles.title}>
              {activeTrip ? formatTripTitle(activeTrip) : 'Iniciar viaje'}
            </Text>
            <Text style={styles.subtitle}>
              {activeTrip
                ? getTripSegmentSubtitle(activeTrip)
                : 'Elige el tramo del día para comenzar.'}
            </Text>
            {activeTrip && activeTripMeta ? (
              <Text style={styles.tripMeta}>Iniciado {activeTripMeta}</Text>
            ) : null}
            {activeTrip && capabilities.canViewRoster ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver historial de los últimos 7 días"
                onPress={() => router.push(OPS_ROUTES.activity)}
                style={styles.historyLink}
              >
                <MaterialCommunityIcons name="history" size={18} color={colors.primary} />
                <Text style={styles.historyLinkText}>Historial (7 días)</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.mainCard}>
            {!activeTrip ? (
              <>
                <Text style={styles.sectionLabel}>Turno</Text>
                <View style={styles.selectorContainer}>
                  <Pressable
                    style={[styles.selectorButton, period === 'mañana' && styles.selectorButtonActive]}
                    onPress={() => setPeriod('mañana')}
                  >
                    <MaterialCommunityIcons
                      name="weather-sunny"
                      size={16}
                      color={period === 'mañana' ? colors.textInverse : colors.tripSelectorIdleText}
                    />
                    <Text
                      style={[
                        styles.selectorText,
                        period === 'mañana' ? styles.selectorLabelActive : styles.selectorLabelIdle,
                      ]}
                    >
                      Mañana
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.selectorButton, period === 'tarde' && styles.selectorButtonActive]}
                    onPress={() => setPeriod('tarde')}
                  >
                    <MaterialCommunityIcons
                      name="weather-sunset"
                      size={16}
                      color={period === 'tarde' ? colors.textInverse : colors.tripSelectorIdleText}
                    />
                    <Text
                      style={[
                        styles.selectorText,
                        period === 'tarde' ? styles.selectorLabelActive : styles.selectorLabelIdle,
                      ]}
                    >
                      Tarde
                    </Text>
                  </Pressable>
                </View>

                {period === 'mañana' ? (
                  <Text style={styles.morningHint}>
                    Recojo matutino: casas y paradas hacia el colegio.
                  </Text>
                ) : (
                  <>
                    <Text style={styles.sectionLabel}>Tramo tarde</Text>
                    <View style={styles.afternoonList}>
                      {AFTERNOON_TURN_OPTIONS.map((option) => {
                        const isActive = afternoonTurn === option.id;
                        return (
                          <Pressable
                            key={option.id}
                            style={[styles.afternoonOption, isActive && styles.afternoonOptionActive]}
                            onPress={() => setAfternoonTurn(option.id)}
                          >
                            <MaterialCommunityIcons
                              name={isActive ? 'radiobox-marked' : 'radiobox-blank'}
                              size={22}
                              color={isActive ? colors.primary : colors.textMuted}
                            />
                            <View style={styles.afternoonOptionBody}>
                              <Text
                                style={[
                                  styles.afternoonOptionTitle,
                                  isActive && styles.afternoonOptionTitleActive,
                                ]}
                              >
                                {option.label}
                              </Text>
                              <Text style={styles.afternoonOptionHint}>{option.hint}</Text>
                              {getSuggestedLevelFilterHint(option.id) ? (
                                <Text style={styles.afternoonOptionHint}>
                                  {getSuggestedLevelFilterHint(option.id)}
                                </Text>
                              ) : null}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                )}

                <View style={styles.infoContainer}>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="bus" size={18} color={colors.sky} />
                    <Text style={styles.infoText}>
                      Unidad asignada: {operationalContext?.busLabel ?? 'BUS-01'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="account-check" size={18} color={colors.sky} />
                    <Text style={styles.infoText}>Conductor listo</Text>
                  </View>
                </View>

                {errorMessage ? (
                  <HelperText type="error" visible style={styles.errorText}>
                    {errorMessage}
                  </HelperText>
                ) : null}

                <TripDailyChecklist context={checklistContext} />

                {capabilities.canStartTrip ? (
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
                ) : null}
              </>
            ) : (
              <>
                <View style={styles.statsRow}>
                  <View style={styles.statChip}>
                    <Text style={styles.statValue}>{dashboard.stats.onboardCount}</Text>
                    <Text style={styles.statLabel}>{dashboardStatLabels.onboard}</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Text style={styles.statValue}>{dashboard.stats.pendingCount}</Text>
                    <Text style={styles.statLabel}>{dashboardStatLabels.pending}</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Text style={styles.statValue}>{dashboard.stats.completedCount}</Text>
                    <Text style={styles.statLabel}>{dashboardStatLabels.third}</Text>
                  </View>
                </View>

                {morningRiders.isVisible ? (
                  <MorningRiderReminderBanner
                    count={morningRiders.count}
                    preview={morningRiders.preview}
                    onPress={() => {
                      requestRosterView('prioritarios');
                      router.push(OPS_ROUTES.roster);
                    }}
                  />
                ) : null}

                <TripDailyChecklist context={checklistContext} />

                <View style={styles.sectionDivider} />

                <View style={styles.activeActions}>
                  {capabilities.canScan ? (
                    <Button
                      mode="contained"
                      icon="qrcode-scan"
                      buttonColor={colors.primary}
                      onPress={() => router.push(OPS_ROUTES.scanner)}
                      style={styles.actionButton}
                      contentStyle={styles.actionButtonContent}
                      labelStyle={styles.startButtonLabel}
                    >
                      Ir a escáner
                    </Button>
                  ) : null}

                  {capabilities.canViewRoster ? (
                    <Button
                      mode="outlined"
                      icon="format-list-bulleted"
                      textColor={colors.primary}
                      onPress={() => router.push(OPS_ROUTES.roster)}
                      style={styles.actionButton}
                      contentStyle={styles.actionButtonContent}
                    >
                      Ver lista
                    </Button>
                  ) : null}

                  {capabilities.canBulkDropoff && dashboard.totalOnboardCount > 0 ? (
                    <Button
                      mode="contained"
                      buttonColor={colors.primaryPressed}
                      icon={activeTrip.direction === 'recojo' ? 'school' : 'home'}
                      loading={dashboard.isBulkDropping}
                      disabled={dashboard.isBulkDropping}
                      onPress={() => void dashboard.handleBulkDropoff()}
                      style={styles.actionButton}
                      contentStyle={styles.actionButtonContent}
                      labelStyle={styles.startButtonLabel}
                    >
                      {activeTrip.direction === 'recojo'
                        ? `Dejar todos en colegio (${dashboard.totalOnboardCount})`
                        : `Dejar todos en casa (${dashboard.totalOnboardCount})`}
                    </Button>
                  ) : null}

                  {dashboard.bulkError ? (
                    <HelperText type="error" visible>
                      {dashboard.bulkError}
                    </HelperText>
                  ) : null}

                  {capabilities.canCloseTrip ? (
                    <Button
                      mode="outlined"
                      icon="check-circle-outline"
                      textColor={colors.tripActionOutlineText}
                      onPress={() => router.push(OPS_ROUTES.closeTrip)}
                      style={styles.actionButton}
                      contentStyle={styles.actionButtonContent}
                    >
                      Cerrar viaje
                    </Button>
                  ) : null}
                </View>
              </>
            )}
          </View>

          {!activeTrip && capabilities.canStartTrip ? (
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
          ) : null}

          {!activeTrip ? historyFooter : null}
        </View>
      </AppScrollView>
    </SafeAreaView>
  );
}
