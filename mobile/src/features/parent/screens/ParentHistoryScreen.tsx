import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { ChildTimelineList } from "@/src/features/parent/components/ChildTimelineList";
import { ParentEmptyState } from "@/src/features/parent/components/ParentEmptyState";
import { useParentChildren } from "@/src/features/parent/hooks/useParentChildren";
import { getChildTimelineForDay } from "@/src/features/parent/services/child-timeline.service";
import type { ChildTimelineEvent } from "@/src/features/parent/types";
import { ActivityDaySelector } from "@/src/features/trips/components/ActivityDaySelector";
import { buildDayOptions } from "@/src/features/trips/domain/activity-grouping";
import { getLocalTodayDateIso } from "@/src/shared/utils/local-date";
import { AppScrollView } from "@/src/shared/ui/AppScrollView";
import { WaveHeader } from "@/src/shared/ui/WaveHeader";

export default function ParentHistoryScreen() {
  const { colors, tokens } = useAppTheme();
  const { children, loading: childrenLoading } = useParentChildren();
  const dayOptions = useMemo(() => buildDayOptions(), []);
  const [selectedDate, setSelectedDate] = useState(() => getLocalTodayDateIso());
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [events, setEvents] = useState<ChildTimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const studentId = selectedChildId ?? children[0]?.student.id ?? null;

  useEffect(() => {
    if (!studentId || !selectedDate) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getChildTimelineForDay(studentId, selectedDate)
      .then((next) => {
        if (!cancelled) {
          setEvents(next);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setEvents([]);
          setError(reason instanceof Error ? reason.message : "No se pudo cargar el historial.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate, studentId]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: colors.screenSolid,
        },
        content: {
          paddingHorizontal: tokens.spacing.lg,
          gap: tokens.spacing.md,
        },
        children: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: tokens.spacing.xs,
        },
        chip: {
          minHeight: tokens.layout.minTouchTarget,
          justifyContent: "center",
          paddingHorizontal: tokens.spacing.md,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.surfaceTrack,
        },
        chipActive: {
          backgroundColor: colors.headerBg,
        },
        chipText: {
          ...tokens.typography.label,
          color: colors.textBody,
        },
        chipTextActive: {
          color: colors.onHeader,
        },
        error: {
          ...tokens.typography.body,
          color: colors.feedbackError,
          textAlign: "center",
        },
        empty: {
          ...tokens.typography.body,
          color: colors.textMuted,
          textAlign: "center",
          paddingVertical: tokens.spacing.xl,
        },
      }),
    [colors, tokens],
  );

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
      <WaveHeader title="Historial" subtitle="Últimos 7 días" />
      <AppScrollView contentContainerStyle={styles.content} extraBottomInset={tokens.spacing.lg}>
        {!childrenLoading && !children.length ? (
          <ParentEmptyState
            title="Sin hijos vinculados"
            message="Contacta a la municipalidad para vincular tu cuenta con los alumnos a tu cargo."
          />
        ) : (
          <>
            {children.length > 1 ? (
              <View style={styles.children}>
                {children.map(({ student }) => {
                  const active = student.id === studentId;
                  return (
                    <Pressable
                      key={student.id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setSelectedChildId(student.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {student.nombre_alumno}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <ActivityDaySelector
              options={dayOptions}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              embedded
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {loading || childrenLoading ? (
              <ActivityIndicator animating size={36} color={colors.primary} />
            ) : !error && !events.length ? (
              <Text style={styles.empty}>Sin registros este día.</Text>
            ) : (
              <ChildTimelineList events={events} />
            )}
          </>
        )}
      </AppScrollView>
    </SafeAreaView>
  );
}
