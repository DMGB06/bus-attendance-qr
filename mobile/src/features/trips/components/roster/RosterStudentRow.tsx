import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Avatar, Text } from "react-native-paper";

import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";

interface RosterStudentRowProps {
  item: TripRosterItem;
  onMarkExit?: (studentId: string) => void;
  isMarkingExit?: boolean;
}

function getStatusLabel(item: TripRosterItem) {
  if (item.status === "pending") return "Pendiente";
  if (item.status === "completed") return "Salida";
  if (item.attendance?.event_type === "ausente") return "Ausente";
  if (item.attendance?.event_type === "manual") return "Manual";
  return "Abordo";
}

export function RosterStudentRow({
  item,
  onMarkExit,
  isMarkingExit = false,
}: RosterStudentRowProps) {
  const { colors, tokens } = useAppTheme();

  const statusColors = useMemo(() => {
    if (item.status === "pending") {
      return {
        stripe: colors.attendancePending,
        tagBg: "rgba(197, 48, 48, 0.1)",
        tagText: colors.attendancePending,
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
  }, [colors, item.status]);

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
        trailing: {
          width: 84,
          alignItems: "flex-end",
          justifyContent: "center",
          gap: tokens.spacing.sm,
        },
        statusTag: {
          backgroundColor: statusColors.tagBg,
          borderRadius: tokens.radius.xs,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: 3,
          minWidth: 72,
          alignItems: "center",
        },
        statusTagText: {
          ...tokens.typography.overline,
          color: statusColors.tagText,
          letterSpacing: 0.2,
        },
        actionLink: {
          paddingVertical: tokens.spacing.xs,
        },
        actionText: {
          ...tokens.typography.label,
          color: colors.attendanceCompleted,
        },
      }),
    [colors, statusColors, tokens],
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
        {scannedAt ? <Text style={styles.meta}>Escaneado {scannedAt}</Text> : null}
      </View>

      <View style={styles.trailing}>
        <View style={styles.statusTag}>
          <Text style={styles.statusTagText}>{getStatusLabel(item)}</Text>
        </View>
        {item.canMarkExit && onMarkExit ? (
          isMarkingExit ? (
            <ActivityIndicator size="small" color={colors.attendanceCompleted} />
          ) : (
            <Pressable onPress={() => onMarkExit(item.student.id)} style={styles.actionLink}>
              <Text style={styles.actionText}>Salida</Text>
            </Pressable>
          )
        ) : null}
      </View>
    </View>
  );
}
