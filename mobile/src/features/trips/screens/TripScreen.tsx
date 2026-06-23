import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
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
import {
  getDefaultAfternoonTurn,
  getDefaultTripPeriod,
  getTurnStartBlockedMessage,
  isTurnCompletedToday,
} from '@/src/features/trips/domain/trip-start.rules';
import { useMorningRiderSummary } from '@/src/features/trips/hooks/useMorningRiderSummary';
import { useTodayCompletedTurns } from '@/src/features/trips/hooks/useTodayCompletedTurns';
import { WaitingForDriverView } from '@/src/features/trips/components/WaitingForDriverView';
import { TripDailyChecklist } from '@/src/features/trips/components/TripDailyChecklist';
import type { DailyChecklistContext } from '@/src/features/trips/domain/trip-daily-checklist';
import { useTripDashboard } from '@/src/features/trips/hooks/useTripDashboard';
import { createTripScreenStyles } from '@/src/features/trips/screens/tripScreen.styles';
import { startTrip } from '@/src/features/trips/services/trips.service';
import { useRosterItems } from '@/src/features/trips/store/rosterStore';
import { useTripStore } from '@/src/features/trips/store/tripStore';
import { requestRosterView } from '@/src/features/trips/utils/roster-navigation';
import { getErrorMessage } from '@/src/shared/utils/errors';
import type { Trip, TurnType } from '@/src/features/trips/types';
import { useAppTheme } from '@/src/core/theme/ThemeProvider';
import { AppScrollView } from '@/src/shared/ui/AppScrollView';
import { useCompactScreen } from '@/src/shared/hooks/useCompactScreen';
import { useScreenPerfMark } from '@/src/shared/hooks/useScreenPerfMark';

type TripPeriod = 'mañana' | 'tarde';

export default function TripScreen() {
  const router = useRouter();
  useScreenPerfMark('trip');
  const {
    activeTrip,
    operationalContext,
    isHydrating,
    hasHydratedOnce,
    setActiveTrip,
    closeSuccessMessage,
    acknowledgeCloseSuccess,
  } = useTripStore();
  const { capabilities, loading: capabilitiesLoading } = useAppCapabilities();
  const [period, setPeriod] = useState<TripPeriod>('mañana');
  const [afternoonTurn, setAfternoonTurn] = useState<AfternoonTurnType>('tarde_primaria');
  const [isStartingTrip, setIsStartingTrip] = useState(false);
  const [optimisticTrip, setOptimisticTrip] = useState<Trip | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const appliedIdleDefaultsKeyRef = useRef('');
  const visibleTrip = activeTrip ?? optimisticTrip;
  const dashboard = useTripDashboard(visibleTrip);
  const rosterItems = useRosterItems(visibleTrip?.id);
  const morningRiders = useMorningRiderSummary(
    visibleTrip?.trip_date,
    visibleTrip?.direction,
    rosterItems,
  );
  const { completedTurns, refresh: refreshCompletedTurns } = useTodayCompletedTurns(
    !visibleTrip ? operationalContext?.busId : null,
  );
  const morningCompletedToday = isTurnCompletedToday(completedTurns, 'mañana');
  const selectedTurnType = period === 'mañana' ? 'mañana' : afternoonTurn;
  const selectedTurnBlocked = isTurnCompletedToday(completedTurns, selectedTurnType);
  const selectedTurnBlockedMessage = selectedTurnBlocked
    ? getTurnStartBlockedMessage(selectedTurnType)
    : null;
  const dashboardStatLabels = useMemo(
    () => getTripDashboardStatLabels(visibleTrip?.direction ?? 'recojo'),
    [visibleTrip?.direction],
  );
  const checklistContext = useMemo((): DailyChecklistContext => {
    if (!visibleTrip) {
      return {
        hasActiveTrip: false,
        direction: null,
        onboardCount: 0,
        pendingCount: 0,
        completedCount: 0,
        morningRiderPendingCount: 0,
        setupPeriod: period,
        canCloseTrip: capabilities.canCloseTrip,
      };
    }

    return {
      hasActiveTrip: true,
      direction: visibleTrip.direction,
      onboardCount: dashboard.stats.onboardCount,
      pendingCount: dashboard.stats.pendingCount,
      completedCount: dashboard.stats.completedCount,
      morningRiderPendingCount: morningRiders.count,
      canCloseTrip: capabilities.canCloseTrip,
    };
  }, [
    visibleTrip,
    dashboard.stats.completedCount,
    dashboard.stats.onboardCount,
    dashboard.stats.pendingCount,
    morningRiders.count,
    period,
    capabilities.canCloseTrip,
  ]);
  const { colors, tokens } = useAppTheme();

  const { isCompact } = useCompactScreen();
  const styles = useMemo(
    () => createTripScreenStyles(colors, tokens, isCompact),
    [colors, isCompact, tokens],
  );
  const showBulkDropoff = Boolean(
    visibleTrip && capabilities.canBulkDropoff && dashboard.totalOnboardCount > 0,
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
    if (!closeSuccessMessage) {
      return;
    }

    void refreshCompletedTurns();
    const timer = setTimeout(() => acknowledgeCloseSuccess(), 6000);
    return () => clearTimeout(timer);
  }, [acknowledgeCloseSuccess, closeSuccessMessage, refreshCompletedTurns]);

  useEffect(() => {
    if (activeTrip) {
      setOptimisticTrip(null);
    }
  }, [activeTrip]);

  useEffect(() => {
    if (visibleTrip) {
      appliedIdleDefaultsKeyRef.current = '';
      return;
    }

    if (isStartingTrip || optimisticTrip || completedTurns.length === 0) {
      return;
    }

    const defaultsKey = completedTurns.join('|');
    if (appliedIdleDefaultsKeyRef.current === defaultsKey) {
      return;
    }

    appliedIdleDefaultsKeyRef.current = defaultsKey;
    setPeriod(getDefaultTripPeriod(completedTurns));
    setAfternoonTurn(getDefaultAfternoonTurn(completedTurns));
  }, [visibleTrip, completedTurns, isStartingTrip, optimisticTrip]);

  async function handleStartTrip() {
    if (visibleTrip || !capabilities.canStartTrip) return;

    if (selectedTurnBlocked) {
      setErrorMessage(
        selectedTurnBlockedMessage ?? getTurnStartBlockedMessage(getSelectedTurnType()),
      );
      return;
    }

    setIsStartingTrip(true);
    setErrorMessage(null);
    setOptimisticTrip(null);

    try {
      const trip = await startTrip(getSelectedTurnType());
      setOptimisticTrip(trip);
      setActiveTrip(trip);
    } catch (error: unknown) {
      setOptimisticTrip(null);
      setErrorMessage(getErrorMessage(error, 'No se pudo iniciar el viaje.'));
    } finally {
      setIsStartingTrip(false);
    }
  }

  function getSelectedTurnType(): TurnType {
    return period === 'mañana' ? 'mañana' : afternoonTurn;
  }

  const activeTripMeta = visibleTrip?.started_at
    ? new Date(visibleTrip.started_at).toLocaleString('es-PE', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  if (capabilitiesLoading || (isHydrating && !visibleTrip) || (!hasHydratedOnce && !visibleTrip)) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={styles.startingShell}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

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
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      {visibleTrip ? (
        <View style={styles.activeTripShell}>
          <View style={styles.activeTripFixed}>
            <View style={styles.pageHeaderCompact}>
              <Text style={styles.titleCompact}>{formatTripTitle(visibleTrip)}</Text>
              <Text style={styles.subtitleCompact}>
                {getTripSegmentSubtitle(visibleTrip)}
                {activeTripMeta ? ` · Iniciado ${activeTripMeta}` : ''}
              </Text>
              {capabilities.canViewRoster ? (
                <Pressable
                  style={styles.historyLink}
                  onPress={() => router.push(OPS_ROUTES.activity)}
                  accessibilityRole="button"
                  accessibilityLabel="Ver historial de 7 días"
                >
                  <MaterialCommunityIcons name="history" size={16} color={colors.primary} />
                  <Text style={styles.historyLinkText}>Historial (7 días)</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.activeMainCard}>
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

              <View style={styles.primaryActionRow}>
                {capabilities.canScan ? (
                  <Button
                    mode="contained"
                    icon="qrcode-scan"
                    buttonColor={colors.primary}
                    onPress={() => router.push(OPS_ROUTES.scanner)}
                    style={styles.primaryActionButton}
                    contentStyle={styles.compactActionContent}
                    labelStyle={styles.startButtonLabel}
                  >
                    Escáner
                  </Button>
                ) : null}

                {capabilities.canViewRoster ? (
                  <Button
                    mode="outlined"
                    icon="format-list-bulleted"
                    textColor={colors.primary}
                    onPress={() => router.push(OPS_ROUTES.roster)}
                    style={styles.primaryActionButton}
                    contentStyle={styles.compactActionContent}
                  >
                    Lista
                  </Button>
                ) : null}
              </View>

              {showBulkDropoff ? (
                <Button
                  mode="contained"
                  buttonColor={colors.primaryPressed}
                  icon={visibleTrip.direction === 'recojo' ? 'school' : 'home'}
                  loading={dashboard.isBulkDropping}
                  disabled={dashboard.isBulkDropping}
                  onPress={() => void dashboard.handleBulkDropoff()}
                  style={styles.actionButton}
                  contentStyle={styles.compactActionContent}
                  labelStyle={styles.startButtonLabel}
                >
                  {visibleTrip.direction === 'recojo'
                    ? `Dejar todos en colegio (${dashboard.totalOnboardCount})`
                    : `Dejar todos en casa (${dashboard.totalOnboardCount})`}
                </Button>
              ) : null}

              {dashboard.bulkError ? (
                <HelperText type="error" visible>
                  {dashboard.bulkError}
                </HelperText>
              ) : null}
            </View>
          </View>

          <AppScrollView
            style={styles.scroll}
            extraBottomInset={tokens.spacing.sm}
            contentGrow={false}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.activeScrollBody}>
              <TripDailyChecklist context={checklistContext} compact />

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

              {capabilities.canCloseTrip ? (
                <Button
                  mode="outlined"
                  icon="check-circle-outline"
                  textColor={colors.tripActionOutlineText}
                  onPress={() => router.push(OPS_ROUTES.closeTrip)}
                  style={styles.closeTripButton}
                  contentStyle={styles.compactActionContent}
                >
                  Cerrar viaje
                </Button>
              ) : null}
            </View>
          </AppScrollView>
        </View>
      ) : isStartingTrip ? (
        <View style={styles.startingShell}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.startingText}>Iniciando viaje…</Text>
        </View>
      ) : (
        <AppScrollView
          style={styles.scroll}
          extraBottomInset={tokens.spacing.md}
          contentGrow={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {closeSuccessMessage ? (
              <View style={styles.closeSuccessBanner}>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={20}
                  color={colors.attendanceCompleted}
                />
                <Text style={styles.closeSuccessText}>{closeSuccessMessage}</Text>
              </View>
            ) : null}

            <View style={styles.pageHeader}>
              <Text style={styles.title}>Iniciar viaje</Text>
              <Text style={styles.subtitle}>Elige el tramo del día para comenzar.</Text>
            </View>

            <View style={styles.mainCard}>
              <Text style={styles.sectionLabel}>Turno</Text>
              <View style={styles.selectorContainer}>
                <Pressable
                  disabled={morningCompletedToday}
                  style={[
                    styles.selectorButton,
                    period === 'mañana' && styles.selectorButtonActive,
                    morningCompletedToday && styles.selectorButtonDisabled,
                  ]}
                  onPress={() => {
                    if (!morningCompletedToday) {
                      setPeriod('mañana');
                    }
                  }}
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
                      const isCompleted = isTurnCompletedToday(completedTurns, option.id);
                      return (
                        <Pressable
                          key={option.id}
                          disabled={isCompleted}
                          style={[
                            styles.afternoonOption,
                            isActive && styles.afternoonOptionActive,
                            isCompleted && styles.afternoonOptionDisabled,
                          ]}
                          onPress={() => {
                            if (!isCompleted) {
                              setAfternoonTurn(option.id);
                            }
                          }}
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

              {selectedTurnBlockedMessage ? (
                <HelperText type="info" visible style={styles.errorText}>
                  {selectedTurnBlockedMessage}
                </HelperText>
              ) : null}

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
                  disabled={isStartingTrip || selectedTurnBlocked}
                  style={styles.startButton}
                  contentStyle={styles.startButtonContent}
                  labelStyle={styles.startButtonLabel}
                  buttonColor={colors.primary}
                >
                  Iniciar viaje
                </Button>
              ) : null}
            </View>

            {capabilities.canStartTrip ? (
              <View style={styles.warning}>
                <MaterialCommunityIcons
                  name="shield-alert-outline"
                  size={18}
                  color={colors.feedbackWarningGlyph}
                />
                <Text style={styles.warningBody}>Cinturones puestos antes de salir.</Text>
              </View>
            ) : null}

            {historyFooter}
          </View>
        </AppScrollView>
      )}
    </SafeAreaView>
  );
}
