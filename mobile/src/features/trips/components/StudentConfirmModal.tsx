import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, HelperText, Modal, Portal, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { StudentCard } from "@/src/features/trips/components/StudentCard";
import type { Student } from "@/src/features/trips/types";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";

interface StudentConfirmModalProps {
  visible: boolean;
  student: Student | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  confirmLabel?: string;
  subtitle?: string;
  statusHint?: string | null;
  onDismiss: () => void;
  onConfirm: () => void;
}

export function StudentConfirmModal({
  visible,
  student,
  isSubmitting,
  errorMessage,
  confirmLabel = "Confirmar asistencia",
  subtitle = "Verifica los datos antes de registrar la asistencia.",
  statusHint = null,
  onDismiss,
  onConfirm,
}: StudentConfirmModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        modalContainer: {
          flex: 1,
          margin: 0,
        },
        modalOverlay: {
          backgroundColor: "transparent",
        },
        modalBackdrop: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.modalBackdrop,
        },
        sheet: {
          backgroundColor: colors.modalSheetBg,
          borderTopLeftRadius: tokens.radius.xl,
          borderTopRightRadius: tokens.radius.xl,
          borderWidth: 1,
          borderColor: colors.modalSheetBorder,
          borderBottomWidth: 0,
          overflow: "hidden",
          marginTop: "auto",
          zIndex: 1,
        },
        sheetHeader: {
          backgroundColor: colors.modalStudentBannerBg,
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.md,
          paddingBottom: tokens.spacing.lg,
          gap: tokens.spacing.sm,
        },
        handle: {
          width: tokens.spacing.xl,
          height: 3,
          borderRadius: tokens.radius.xs,
          backgroundColor: colors.modalHandle,
          alignSelf: "center",
        },
        studentRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.md,
        },
        studentAvatar: {
          width: tokens.layout.iconMd,
          height: tokens.layout.iconMd,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.modalAvatarBg,
          borderWidth: 2,
          borderColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
        },
        studentHeaderInfo: {
          flex: 1,
          gap: 2,
        },
        studentName: {
          ...tokens.typography.headline,
          color: colors.modalName,
        },
        studentCode: {
          ...tokens.typography.caption,
          color: colors.modalStatus,
        },
        body: {
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.lg,
          gap: tokens.spacing.md,
        },
        subtitle: {
          ...tokens.typography.caption,
          color: colors.modalSubtitle,
        },
        errorText: {
          marginTop: -tokens.spacing.sm,
        },
        actions: {
          gap: tokens.spacing.sm,
          paddingTop: tokens.spacing.xs,
        },
        btnContent: {
          paddingVertical: tokens.spacing.xs,
        },
        btnConfirm: {
          borderRadius: tokens.radius.md,
        },
        btnCancel: {
          borderRadius: tokens.radius.md,
        },
      }),
    [colors, tokens],
  );

  return (
    <Portal>
      <Modal
        visible={visible && Boolean(student)}
        style={styles.modalOverlay}
        onDismiss={() => {
          if (!isSubmitting) {
            onDismiss();
          }
        }}
        contentContainerStyle={styles.modalContainer}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar confirmación"
          disabled={isSubmitting}
          onPress={() => {
            if (!isSubmitting) {
              onDismiss();
            }
          }}
          style={styles.modalBackdrop}
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, tokens.spacing.lg) }]}>
          {student ? (
            <>
              <View style={styles.sheetHeader}>
                <View style={styles.handle} />
                <View style={styles.studentRow}>
                  <View style={styles.studentAvatar}>
                    <MaterialCommunityIcons
                      name="account"
                      size={tokens.fontSize.xl}
                      color={colors.primaryIconContrast}
                    />
                  </View>
                  <View style={styles.studentHeaderInfo}>
                    <Text style={styles.studentName}>{student.nombre_alumno}</Text>
                    <Text style={styles.studentCode}>
                      {statusHint ?? (student.codigo ? `Código ${student.codigo}` : "Confirmar registro")}
                    </Text>
                  </View>
                </View>
              </View>

              <ScrollView
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.subtitle}>{subtitle}</Text>

                <StudentCard student={student} />

                {errorMessage ? (
                  <HelperText type="error" style={styles.errorText}>
                    {errorMessage}
                  </HelperText>
                ) : null}

                <View style={styles.actions}>
                  <Button
                    mode="contained"
                    onPress={onConfirm}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    contentStyle={styles.btnContent}
                    style={styles.btnConfirm}
                    buttonColor={colors.primary}
                  >
                    {confirmLabel}
                  </Button>
                  <Button
                    mode="outlined"
                    textColor={colors.primary}
                    onPress={() => {
                      if (!isSubmitting) {
                        onDismiss();
                      }
                    }}
                    disabled={isSubmitting}
                    contentStyle={styles.btnContent}
                    style={styles.btnCancel}
                  >
                    Cancelar
                  </Button>
                </View>
              </ScrollView>
            </>
          ) : null}
        </View>
      </Modal>
    </Portal>
  );
}
