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
        avatar: colors.attendancePending,
        tagBg: colors.statusPendingBg,
        tagText: colors.statusPendingText,
      };
    }
    if (item.attendance?.event_type === "ausente") {
      return {
        avatar: colors.textMuted,
        tagBg: colors.surfaceTrack,
        tagText: colors.textMuted,
      };
    }
    if (item.status === "completed") {
      return {
        avatar: colors.attendanceCompleted,
        tagBg: colors.statusCompletedBg,
        tagText: colors.statusCompletedText,
      };
    }
    return {
      avatar: colors.attendanceOnboard,
      tagBg: colors.statusOnboardBg,
      tagText: colors.statusOnboardText,
    };
  }, [colors, item.attendance?.event_type, item.status]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: colors.borderMuted,
          paddingVertical: tokens.spacing.md,
          gap: tokens.spacing.md,
          minHeight: 64,
        },
        avatar: {
          backgroundColor: statusColors.avatar,
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
          color: colors.statusCompletedText,
        },
        onboardMeta: {
          ...tokens.typography.caption,
          color: colors.statusOnboardText,
          fontWeight: "600",
        },
        morningHint: {
          ...tokens.typography.caption,
          color: isMorningRider ? colors.primarySoftText : colors.textMuted,
        },
        trailing: {
          alignItems: "flex-end",
          justifyContent: "center",
        },
        statusTag: {
          backgroundColor: statusColors.tagBg,
          borderRadius: tokens.radius.sm,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: tokens.spacing.xs,
          alignItems: "center",
        },
        statusTagText: {
          ...tokens.typography.label,
          color: statusColors.tagText,
          textAlign: "center",
        },
        dropoffButton: {
          backgroundColor: colors.attendanceCompleted,
          borderRadius: tokens.radius.md,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: tokens.spacing.xs,
          width: 92,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
        },
        dropoffButtonText: {
          ...tokens.typography.label,
          color: colors.attendanceLabel,
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
          color: colors.statusPendingText,
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
      return <ActivityIndicator size="small" color={colors.statusCompletedText} />;
    }

    if (showDropoffButton) {
      return (
        <Pressable
          onPress={() => onMarkExit?.(item.student.id)}
          style={styles.dropoffButton}
          accessibilityRole="button"
          accessibilityLabel={`${getDropoffActionLabel(tripDirection)}: ${item.student.nombre_alumno}`}
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
            hitSlop={8}
            style={styles.absentButton}
            accessibilityRole="button"
            accessibilityLabel={`Marcar ausente a ${item.student.nombre_alumno}`}
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
                hitSlop={8}
                style={styles.correctionButton}
                accessibilityRole="button"
                accessibilityLabel={`Deshacer registro de ${item.student.nombre_alumno}`}
              >
                <Text style={styles.correctionText}>Deshacer</Text>
              </Pressable>
            ) : null}
            {canVoid ? (
              <Pressable
                onPress={() => onVoid?.(item.student.id)}
                hitSlop={8}
                style={styles.correctionButton}
                accessibilityRole="button"
                accessibilityLabel={`Anular registro de ${item.student.nombre_alumno}`}
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
      <Avatar.Text
        size={36}
        label={initials || "AL"}
        style={styles.avatar}
        color={colors.attendanceLabel}
      />

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
          <Text style={styles.meta}>Registrado {scannedAt}</Text>
        ) : null}
      </View>

      <View style={styles.trailing}>{renderTrailing()}</View>
    </View>
  );
});
