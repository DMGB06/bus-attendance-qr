import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import type { Student } from "@/src/features/trips/types";

type ScannerFeedbackDockProps = {
  isSearching: boolean;
  student: Student | null;
  errorMessage: string | null;
  successMessage: string | null;
  infoMessage: string | null;
  isRegistering: boolean;
  onReset: () => void;
};

export function ScannerFeedbackDock({
  isSearching,
  student,
  errorMessage,
  successMessage,
  infoMessage,
  isRegistering,
  onReset,
}: ScannerFeedbackDockProps) {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          width: "100%",
          gap: tokens.spacing.sm,
        },
        caption: {
          ...tokens.typography.caption,
          color: colors.textMuted,
          textAlign: "center",
          lineHeight: 18,
          paddingHorizontal: tokens.spacing.md,
        },
        banner: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: tokens.spacing.sm,
          borderRadius: tokens.radius.md,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
          borderWidth: 1,
        },
        bannerText: {
          ...tokens.typography.caption,
          flex: 1,
          lineHeight: 18,
        },
        loadingBanner: {
          backgroundColor: colors.primarySoftBg,
          borderColor: colors.surfaceCardBorder,
        },
        loadingText: {
          color: colors.primarySoftText,
        },
        errorBanner: {
          backgroundColor: colors.feedbackWarningBg,
          borderColor: colors.feedbackWarningBorder,
        },
        errorText: {
          color: colors.feedbackWarningBody,
        },
        successBanner: {
          backgroundColor: "rgba(47, 133, 90, 0.1)",
          borderColor: "rgba(47, 133, 90, 0.2)",
        },
        successText: {
          color: colors.attendanceCompleted,
        },
        infoBanner: {
          backgroundColor: colors.surfaceTrack,
          borderColor: colors.surfaceCardBorder,
        },
        infoText: {
          color: colors.textBody,
        },
        studentBanner: {
          backgroundColor: colors.primarySoftBg,
          borderColor: colors.surfaceCardBorder,
        },
        studentText: {
          color: colors.textTitle,
          ...tokens.typography.bodyStrong,
          lineHeight: 20,
        },
        studentMeta: {
          ...tokens.typography.caption,
          color: colors.textMuted,
          marginTop: tokens.spacing.xs,
        },
        resetAction: {
          alignSelf: "center",
          paddingVertical: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.lg,
        },
        resetLabel: {
          ...tokens.typography.label,
          color: colors.primary,
        },
      }),
    [colors, tokens],
  );

  const showReset =
    !isRegistering &&
    !isSearching &&
    Boolean(errorMessage || successMessage || infoMessage || student);

  return (
    <View style={styles.root}>
      {isSearching ? (
        <View style={[styles.banner, styles.loadingBanner]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.bannerText, styles.loadingText]}>Buscando alumno en el padrón…</Text>
        </View>
      ) : null}

      {student ? (
        <View style={[styles.banner, styles.studentBanner]}>
          <MaterialCommunityIcons name="account-check-outline" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.studentText}>{student.nombre_alumno}</Text>
            <Text style={styles.studentMeta}>Revisa la ficha para confirmar la subida.</Text>
          </View>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={[styles.banner, styles.errorBanner]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.feedbackWarningGlyph} />
          <Text style={[styles.bannerText, styles.errorText]}>{errorMessage}</Text>
        </View>
      ) : null}

      {successMessage ? (
        <View style={[styles.banner, styles.successBanner]}>
          <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.attendanceCompleted} />
          <Text style={[styles.bannerText, styles.successText]}>{successMessage}</Text>
        </View>
      ) : null}

      {infoMessage ? (
        <View style={[styles.banner, styles.infoBanner]}>
          <MaterialCommunityIcons name="information-outline" size={18} color={colors.textMuted} />
          <Text style={[styles.bannerText, styles.infoText]}>{infoMessage}</Text>
        </View>
      ) : null}

      {!isSearching && !errorMessage && !successMessage && !infoMessage && !student ? (
        <Text style={styles.caption}>
          Apunta al carnet dentro del marco para registrar la subida al bus.
        </Text>
      ) : null}

      {showReset ? (
        <Pressable
          onPress={onReset}
          style={styles.resetAction}
          accessibilityRole="button"
          accessibilityLabel="Reiniciar escaneo"
        >
          <Text style={styles.resetLabel}>Reiniciar escaneo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
