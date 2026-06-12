import { memo, useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Avatar, Text } from "react-native-paper";

import type { TripDirection } from "@/src/features/trips/types";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";
import {
  getDropoffActionLabel,
  getMorningHintLabel,
  getRosterStatusLabel,
} from "@/src/features/trips/domain/trip-labels";
import type { RosterRowTheme } from "@/src/features/trips/components/roster/rosterRowTheme";

interface RosterStudentRowProps {
  item: TripRosterItem;
  tripDirection: TripDirection;
  theme: RosterRowTheme;
  showMorningHint?: boolean;
  isMorningRider?: boolean;
  canMarkAbsent?: boolean;
  canUndo?: boolean;
  canVoid?: boolean;
  onMarkExit?: (studentId: string) => void;
  onMarkAbsent?: (studentId: string) => void;
  onUndo?: (studentId: string) => void;
  onVoid?: (studentId: string) => void;
  isMarkingExit?: boolean;
  isCorrecting?: boolean;
}

export const RosterStudentRow = memo(function RosterStudentRow({
  item,
  tripDirection,
  theme,
  showMorningHint = false,
  isMorningRider = false,
  canMarkAbsent = false,
  canUndo = false,
  canVoid = false,
  onMarkExit,
  onMarkAbsent,
  onUndo,
  onVoid,
  isMarkingExit = false,
  isCorrecting = false,
}: RosterStudentRowProps) {
  const { colors, tokens } = theme;

  const showDropoffButton = Boolean(item.canMarkExit && onMarkExit);
  const showAbsentAction = Boolean(canMarkAbsent && onMarkAbsent && item.status === "pending");

  const statusColors = useMemo(() => {
    if (item.status === "pending") {
      return {
        stripe: colors.attendancePending,
        tagBg: "rgba(197, 48, 48, 0.1)",
        tagText: colors.attendancePending,
      };
    }
    if (item.attendance?.event_type === "ausente") {
      return {
        stripe: colors.textMuted,
        tagBg: colors.surfaceTrack,
        tagText: colors.textMuted,
      };
    }
    if (item.status === "completed") {
      return {
        stripe: colors.attendanceCompleted,
        tagBg: "rgba(47, 133, 90, 0.12)",
        tagText: colors.attendanceCompleted,
      };
    }
    return {
      stripe: colors.attendanceOnboard,
      tagBg: colors.primarySoftBg,
      tagText: colors.primarySoftText,
    };
  }, [colors, item.attendance?.event_type, item.status]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surfaceListItem,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderMuted,
          borderLeftWidth: 4,
          borderLeftColor: statusColors.stripe,
          paddingLeft: tokens.spacing.md,
          paddingRight: tokens.spacing.md,
          paddingVertical: tokens.spacing.md,
          gap: tokens.spacing.md,
          minHeight: 64,
        },
        avatar: {
          backgroundColor: colors.primary,
        },
        body: {
          flex: 1,
          gap: 3,
          minWidth: 0,
        },
        name: {
          ...tokens.typography.bodyStrong,
          color: colors.textTitle,
        },
        stop: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
        meta: {
          ...tokens.typography.caption,
          color: colors.sky,
        },
        onboardMeta: {
          ...tokens.typography.caption,
          color: colors.primarySoftText,
          fontWeight: "600",
        },
        morningHint: {
          ...tokens.typography.caption,
          color: isMorningRider ? colors.primarySoftText : colors.textMuted,
        },
        trailing: {
          minWidth: 108,
          alignItems: "flex-end",
          justifyContent: "center",
        },
        statusTag: {
          backgroundColor: statusColors.tagBg,
          borderRadius: tokens.radius.xs,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: 5,
          minWidth: 88,
          alignItems: "center",
        },
        statusTagText: {
          ...tokens.typography.overline,
          color: statusColors.tagText,
          letterSpacing: 0.2,
          textAlign: "center",
        },
        dropoffButton: {
          backgroundColor: colors.attendanceCompleted,
          borderRadius: tokens.radius.sm,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: tokens.spacing.sm,
          minWidth: 108,
          alignItems: "center",
        },
        dropoffButtonText: {
          ...tokens.typography.label,
          color: colors.textOnPrimary,
          textAlign: "center",
        },
        pendingActions: {
          alignItems: "flex-end",
          gap: tokens.spacing.xs,
        },
        absentButton: {
          paddingVertical: 2,
        },
        absentText: {
          ...tokens.typography.caption,
          color: colors.textMuted,
          textDecorationLine: "underline",
        },
        pendingSyncText: {
          ...tokens.typography.caption,
          color: colors.feedbackWarningBody,
          fontWeight: "600",
        },
        correctionActions: {
          alignItems: "flex-end",
          gap: tokens.spacing.xs,
          marginTop: tokens.spacing.xs,
        },
        correctionButton: {
          paddingVertical: 2,
        },
        correctionText: {
          ...tokens.typography.caption,
          color: colors.attendancePending,
          textDecorationLine: "underline",
        },
        voidText: {
          ...tokens.typography.caption,
          color: colors.textMuted,
          textDecorationLine: "underline",
        },
      }),
    [colors, isMorningRider, statusColors, tokens],
  );

  const initials = item.student.nombre_alumno
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const scannedAt = item.attendance?.scanned_at
    ? new Date(item.attendance.scanned_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  function renderTrailing() {
    if (isMarkingExit || isCorrecting) {
      return <ActivityIndicator size="small" color={colors.attendanceCompleted} />;
    }

    if (showDropoffButton) {
      return (
        <Pressable
          onPress={() => onMarkExit?.(item.student.id)}
          style={styles.dropoffButton}
          accessibilityRole="button"
        >
          <Text style={styles.dropoffButtonText}>{getDropoffActionLabel(tripDirection)}</Text>
        </Pressable>
      );
    }

    if (showAbsentAction) {
      return (
        <View style={styles.pendingActions}>
          <View style={styles.statusTag}>
            <Text style={styles.statusTagText}>{getRosterStatusLabel(item, tripDirection)}</Text>
          </View>
          <Pressable
            onPress={() => onMarkAbsent?.(item.student.id)}
            style={styles.absentButton}
            accessibilityRole="button"
          >
            <Text style={styles.absentText}>Marcar ausente</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.pendingActions}>
        <View style={styles.statusTag}>
          <Text style={styles.statusTagText}>{getRosterStatusLabel(item, tripDirection)}</Text>
        </View>
        {item.isPendingSync ? (
          <Text style={styles.pendingSyncText}>Pendiente sync</Text>
        ) : null}
        {(canUndo || canVoid) && (
          <View style={styles.correctionActions}>
            {canUndo ? (
              <Pressable
                onPress={() => onUndo?.(item.student.id)}
                style={styles.correctionButton}
                accessibilityRole="button"
              >
                <Text style={styles.correctionText}>Deshacer</Text>
              </Pressable>
            ) : null}
            {canVoid ? (
              <Pressable
                onPress={() => onVoid?.(item.student.id)}
                style={styles.correctionButton}
                accessibilityRole="button"
              >
                <Text style={styles.voidText}>Anular registro</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Avatar.Text size={36} label={initials || "AL"} style={styles.avatar} />

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {item.student.nombre_alumno}
        </Text>
        <Text style={styles.stop} numberOfLines={1}>
          {item.student.direccion ?? "Sin parada registrada"}
        </Text>
        {showMorningHint ? (
          <Text style={styles.morningHint}>{getMorningHintLabel(isMorningRider)}</Text>
        ) : null}
        {item.status === "onboard" ? (
          <Text style={styles.onboardMeta}>
            A bordo{scannedAt ? ` · ${scannedAt}` : ""}
          </Text>
        ) : scannedAt ? (
          <Text style={styles.meta}>Escaneado {scannedAt}</Text>
        ) : null}
      </View>

      <View style={styles.trailing}>{renderTrailing()}</View>
    </View>
  );
});
