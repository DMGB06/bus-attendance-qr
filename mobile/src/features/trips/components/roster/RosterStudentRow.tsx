import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Avatar, Button, Text } from "react-native-paper";

import { AttendanceBadge } from "@/src/features/trips/components/AttendanceBadge";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";

interface RosterStudentRowProps {
  item: TripRosterItem;
  onMarkManual?: (studentId: string) => void;
  onMarkExit?: (studentId: string) => void;
  isMarkingManual?: boolean;
  isMarkingExit?: boolean;
}

function getBadgeLabel(item: TripRosterItem) {
  if (item.status === "pending") {
    return "PENDIENTE";
  }

  if (item.status === "completed") {
    return "SALIDA";
  }

  if (!item.attendance) {
    return "ABORDO";
  }

  if (item.attendance.event_type === "ausente") {
    return "AUSENTE";
  }

  if (item.attendance.event_type === "manual") {
    return "MANUAL";
  }

  if (item.attendance.event_type === "subio") {
    return "ABORDO";
  }

  return "ABORDO";
}

export function RosterStudentRow({
  item,
  onMarkManual,
  onMarkExit,
  isMarkingManual = false,
  isMarkingExit = false,
}: RosterStudentRowProps) {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.sm,
          backgroundColor: colors.surfaceListItem,
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.sm,
          borderWidth: 1,
          borderColor: colors.borderDefault,
        },
        avatar: {
          backgroundColor: colors.primary,
        },
        body: {
          flex: 1,
          gap: tokens.spacing.xs,
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
          ...tokens.typography.overline,
          color: colors.textMuted,
          letterSpacing: 0.4,
        },
        rightColumn: {
          alignItems: "flex-end",
          gap: tokens.spacing.xs,
        },
      }),
    [colors, tokens],
  );

  const initials = item.student.nombre_alumno
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <View style={styles.row}>
      <Avatar.Text size={tokens.layout.iconMd} label={initials || "AL"} style={styles.avatar} />

      <View style={styles.body}>
        <Text style={styles.name}>{item.student.nombre_alumno}</Text>
        <Text style={styles.stop}>{item.student.direccion ?? "Sin dirección registrada"}</Text>
        {item.attendance?.scanned_at ? (
          <Text style={styles.meta}>
            Escaneado: {new Date(item.attendance.scanned_at).toLocaleTimeString()}
          </Text>
        ) : null}
      </View>

      <View style={styles.rightColumn}>
        <AttendanceBadge status={item.status} label={getBadgeLabel(item)} />
        {item.canMarkManual && onMarkManual ? (
          <Button
            mode="outlined"
            compact
            onPress={() => onMarkManual(item.student.id)}
            loading={isMarkingManual}
            disabled={isMarkingManual || isMarkingExit}
          >
            Manual
          </Button>
        ) : null}
        {item.canMarkExit && onMarkExit ? (
          <Button
            mode="contained-tonal"
            compact
            onPress={() => onMarkExit(item.student.id)}
            loading={isMarkingExit}
            disabled={isMarkingExit || isMarkingManual}
          >
            Salida
          </Button>
        ) : null}
      </View>
    </View>
  );
}
