import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { HelperText, Text } from 'react-native-paper';
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
  getTurnStartSuggestion,
} from '@/src/features/trips/domain/trip-start.rules';
import { useMorningRiderSummary } from '@/src/features/trips/hooks/useMorningRiderSummary';
import { useTodayCompletedTurns } from '@/src/features/trips/hooks/useTodayCompletedTurns';
import { WaitingForDriverView } from '@/src/features/trips/components/WaitingForDriverView';
import { TripDailyChecklist } from '@/src/features/trips/components/TripDailyChecklist';
import { RosterStudentRow } from '@/src/features/trips/components/roster/RosterStudentRow';
import { getTripPrimaryAction } from '@/src/features/trips/domain/trip-primary-action';
import type { DailyChecklistContext } from '@/src/features/trips/domain/trip-daily-checklist';
import { useTripDashboard } from '@/src/features/trips/hooks/useTripDashboard';
import { createTripScreenStyles } from '@/src/features/trips/screens/tripScreen.styles';
import { startTrip } from '@/src/features/trips/services/trips.service';
import { rosterStoreActions, useRosterItems } from '@/src/features/trips/store/rosterStore';
import { useTripStore } from '@/src/features/trips/store/tripStore';
import { requestRosterView } from '@/src/features/trips/utils/roster-navigation';
import { getErrorMessage } from '@/src/shared/utils/errors';
import type { Trip, TurnType } from '@/src/features/trips/types';
import { useAppTheme } from '@/src/core/theme/ThemeProvider';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppScrollView } from '@/src/shared/ui/AppScrollView';
import { HeaderStats } from '@/src/shared/ui/HeaderStats';
import { WaveHeader } from '@/src/shared/ui/WaveHeader';
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
    hydrateActiveTrip,
    closeSuccessMessage,
    acknowledgeCloseSuccess,
  } = useTripStore();
  const { capabilities, loading: capabilitiesLoading } = useAppCapabilities();
  const [period, setPeriod] = useState<TripPeriod>(() => getDefaultTripPeriod([]));
  const [afternoonTurn, setAfternoonTurn] = useState<AfternoonTurnType>('tarde_primaria');
  const [isStartingTrip, setIsStartingTrip] = useState(false);
  const [optimisticTrip, setOptimisticTrip] = useState<Trip | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const appliedIdleDefaultsKeyRef = useRef('');
  const startInFlightRef = useRef(false);
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
  const selectedTurnType = period === 'mañana' ? 'mañana' : afternoonTurn;
  const turnSuggestion = getTurnStartSuggestion(completedTurns, selectedTurnType);
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

  const primaryAction = visibleTrip
    ? getTripPrimaryAction(
        {
          pendingCount: dashboard.stats.pendingCount,
          onboardCount: dashboard.totalOnboardCount,
        },
        capabilities,
      )
    : null;
  const lastOnboard = useMemo(
    () =>
      rosterItems
        .filter((item) => item.status === 'onboard')
        .sort((left, right) =>
          (right.attendance?.scanned_at ?? '').localeCompare(left.attendance?.scanned_at ?? ''),
        )
        .slice(0, 2),
    [rosterItems],
  );
  const rowTheme = useMemo(() => ({ colors, tokens }), [colors, tokens]);

  const historyFooter = capabilities.canViewRoster ? (
    <AppButton
      variant="secondary"
      icon="history"
      onPress={() => router.push(OPS_ROUTES.activity)}
    >
      Ver historial (7 días)
    </AppButton>
  ) : null;

  useFocusEffect(
    useCallback(() => {
      if (!visibleTrip) {
        void Promise.all([hydrateActiveTrip(), refreshCompletedTurns()]);
      }
    }, [visibleTrip, hydrateActiveTrip, refreshCompletedTurns]),
  );

  useEffect(() => {
    if (!closeSuccessMessage) {
      return;
    }
    void refreshCompletedTurns();
    const timer = setTimeout(() => acknowledgeCloseSuccess(), 6000);
    return () => clearTimeout(timer);
  }, [acknowledgeCloseSuccess, closeSuccessMessage, refreshCompletedTurns]);

  useEffect(() => {
    if (visibleTrip || isHydrating || capabilitiesLoading || hasHydratedOnce) {
      return;
    }
    void hydrateActiveTrip();
  }, [visibleTrip, isHydrating, capabilitiesLoading, hasHydratedOnce, hydrateActiveTrip]);

  useEffect(() => {
    if (activeTrip) {
      setOptimisticTrip(null);
    }
  }, [activeTrip]);

  useEffect(() => {
    if (visibleTrip || isStartingTrip || optimisticTrip || completedTurns.length === 0) {
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
    if (visibleTrip || !capabilities.canStartTrip || startInFlightRef.current) return;

    startInFlightRef.current = true;
    setIsStartingTrip(true);
    setErrorMessage(null);
    setOptimisticTrip(null);

    try {
      const trip = await startTrip(getSelectedTurnType());
      setOptimisticTrip(trip);
      setActiveTrip(trip);
      void rosterStoreActions.hydrateTripRoster(trip.id);
    } catch (error: unknown) {
      setOptimisticTrip(null);
      setErrorMessage(getErrorMessage(error, 'No se pudo iniciar el viaje.'));
    } finally {
      startInFlightRef.current = false;
      setIsStartingTrip(false);
    }
  }

  function getSelectedTurnType(): TurnType {
    return period === 'mañana' ? 'mañana' : afternoonTurn;
  }

  const activeTripTime = visibleTrip?.started_at
    ? new Date(visibleTrip.started_at).toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;
  const bulkLabel = visibleTrip
    ? `${visibleTrip.direction === 'recojo' ? 'Dejar todos en colegio' : 'Dejar todos en casa'} (${dashboard.totalOnboardCount})`
    : '';
  const bulkIcon = visibleTrip?.direction === 'recojo' ? 'school' : 'home';

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
      return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;
    }

    if (!operationalContext) {
      return (
        <WaitingForDriverView
          busLabel={null}
          isRefreshing={false}
          title="Sin bus asignado"
          body="No tienes una unidad asignada para hoy. Pide al coordinador que te asigne una."
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
      <WaveHeader
        title={visibleTrip ? formatTripTitle(visibleTrip) : 'Iniciar viaje'}
        subtitle={
          visibleTrip
            ? `${getTripSegmentSubtitle(visibleTrip)}${activeTripTime ? ` · Iniciado ${activeTripTime}` : ''}`
            : operationalContext?.busLabel
        }
      >
        {visibleTrip ? (
          <HeaderStats
            items={[
              { key: 'pending', value: dashboard.stats.pendingCount, label: dashboardStatLabels.pending },
              { key: 'onboard', value: dashboard.stats.onboardCount, label: dashboardStatLabels.onboard },
              { key: 'third', value: dashboard.stats.completedCount, label: dashboardStatLabels.third },
            ]}
          />
        ) : null}
      </WaveHeader>
      {visibleTrip ? (
        <AppScrollView
          style={styles.scroll}
          extraBottomInset={tokens.spacing.sm}
          contentGrow={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.activeScrollBody}>
            {primaryAction === 'scan' ? (
              <AppButton icon="qrcode-scan" onPress={() => router.push(OPS_ROUTES.scanner)}>
                Escanear QR
              </AppButton>
            ) : null}
            {primaryAction === 'bulk' ? (
              <AppButton
                icon={bulkIcon}
                loading={dashboard.isBulkDropping}
                disabled={dashboard.isBulkDropping}
                onPress={() => void dashboard.handleBulkDropoff()}
              >
                {bulkLabel}
              </AppButton>
            ) : null}
            {primaryAction === 'close' ? (
              <AppButton icon="check-circle-outline" onPress={() => router.push(OPS_ROUTES.closeTrip)}>
                Cerrar viaje
              </AppButton>
            ) : null}

            {dashboard.bulkError ? (
              <HelperText type="error" visible>
                {dashboard.bulkError}
              </HelperText>
            ) : null}

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

            {lastOnboard.length ? (
              <View>
                <Text style={styles.sectionLabel}>Últimos registros</Text>
                {lastOnboard.map((item) => (
                  <RosterStudentRow
                    key={item.student.id}
                    item={item}
                    tripDirection={visibleTrip.direction}
                    theme={rowTheme}
                  />
                ))}
              </View>
            ) : null}

            <TripDailyChecklist context={checklistContext} compact />

            {showBulkDropoff && primaryAction !== 'bulk' ? (
              <AppButton
                variant="secondary"
                icon={bulkIcon}
                loading={dashboard.isBulkDropping}
                disabled={dashboard.isBulkDropping}
                onPress={() => void dashboard.handleBulkDropoff()}
              >
                {bulkLabel}
              </AppButton>
            ) : null}

            {capabilities.canCloseTrip && primaryAction !== 'close' ? (
              <AppButton
                variant="secondary"
                icon="check-circle-outline"
                onPress={() => router.push(OPS_ROUTES.closeTrip)}
              >
                Cerrar viaje
              </AppButton>
            ) : null}

            {capabilities.canViewRoster ? (
              <Pressable
                style={styles.historyLink}
                onPress={() => router.push(OPS_ROUTES.activity)}
                accessibilityRole="button"
                accessibilityLabel="Ver historial de 7 días"
              >
                <MaterialCommunityIcons name="history" size={18} color={colors.textLink} />
                <Text style={styles.historyLinkText}>Historial (7 días)</Text>
              </Pressable>
            ) : null}
          </View>
        </AppScrollView>
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
                  color={colors.statusCompletedText}
                />
                <Text style={styles.closeSuccessText}>{closeSuccessMessage}</Text>
              </View>
            ) : null}

            <View style={styles.mainCard}>
              <Text style={styles.sectionLabel}>Turno</Text>
              <View style={styles.selectorContainer}>
                <Pressable
                  style={[
                    styles.selectorButton,
                    period === 'mañana' && styles.selectorButtonActive,
                  ]}
                  onPress={() => setPeriod('mañana')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: period === 'mañana' }}
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
                  accessibilityRole="button"
                  accessibilityState={{ selected: period === 'tarde' }}
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

              {period === 'tarde' ? (
                <>
                  <Text style={styles.sectionLabel}>Tramo tarde</Text>
                  <View style={styles.afternoonList}>
                    {AFTERNOON_TURN_OPTIONS.map((option) => {
                      const isActive = afternoonTurn === option.id;
                      return (
                        <Pressable
                          key={option.id}
                          style={[
                            styles.afternoonOption,
                            isActive && styles.afternoonOptionActive,
                          ]}
                          onPress={() => setAfternoonTurn(option.id)}
                          accessibilityRole="button"
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
              ) : null}

              {turnSuggestion ? (
                <HelperText type="info" visible style={styles.errorText}>
                  {turnSuggestion}
                </HelperText>
              ) : null}

              {errorMessage ? (
                <HelperText type="error" visible style={styles.errorText}>
                  {errorMessage}
                </HelperText>
              ) : null}

              <TripDailyChecklist context={checklistContext} />

              {capabilities.canStartTrip ? (
                <AppButton
                  icon="play"
                  onPress={handleStartTrip}
                  loading={isStartingTrip}
                  disabled={isStartingTrip}
                >
                  Iniciar viaje
                </AppButton>
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
