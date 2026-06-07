import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
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
  onDismiss: () => void;
  onConfirm: () => void;
}

export function StudentConfirmModal({
  visible,
  student,
  isSubmitting,
  errorMessage,
  onDismiss,
  onConfirm,
}: StudentConfirmModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        modalContainer: {
          justifyContent: "flex-end",
          margin: 0,
          flex: 1,
        },
        sheet: {
          backgroundColor: colors.modalSheetBg,
          borderTopLeftRadius: tokens.spacing["2xl"],
          borderTopRightRadius: tokens.spacing["2xl"],
          borderWidth: 1,
          borderColor: colors.modalSheetBorder,
          borderBottomWidth: 0,
          paddingTop: tokens.spacing.md,
          paddingHorizontal: tokens.spacing.xl,
          maxHeight: "90%",
          shadowColor: colors.shadowColor,
          shadowOpacity: 0.35,
          shadowRadius: tokens.spacing.xl,
          shadowOffset: { width: 0, height: -tokens.spacing.sm },
          elevation: 16,
        },
        handle: {
          width: tokens.spacing["2xl"],
          height: tokens.spacing.xs,
          borderRadius: tokens.radius.xs,
          backgroundColor: colors.modalHandle,
          alignSelf: "center",
          marginBottom: tokens.spacing.xl,
        },
        scrollContent: {
          gap: tokens.spacing.xl,
          paddingBottom: tokens.spacing.sm,
        },
        title: {
          ...tokens.typography.title2,
          color: colors.modalTitle,
          textAlign: "center",
        },
        subtitle: {
          ...tokens.typography.body,
          color: colors.modalSubtitle,
          textAlign: "center",
          marginTop: -tokens.spacing.sm,
        },
        studentHeader: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.lg,
          backgroundColor: colors.modalStudentBannerBg,
          borderRadius: tokens.radius.xl,
          padding: tokens.radius.lg,
        },
        studentAvatar: {
          width: tokens.layout.iconLg - tokens.spacing.md,
          height: tokens.layout.iconLg - tokens.spacing.md,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.modalAvatarBg,
          alignItems: "center",
          justifyContent: "center",
        },
        studentHeaderInfo: {
          flex: 1,
          gap: tokens.spacing.xs,
        },
        studentName: {
          ...tokens.typography.headline,
          color: colors.modalName,
        },
        studentStatus: {
          ...tokens.typography.caption,
          color: colors.modalStatus,
          fontWeight: "600",
        },
        errorText: {
          marginTop: -tokens.spacing.sm,
        },
        actions: {
          gap: tokens.spacing.md,
          marginTop: tokens.spacing.xs,
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

  if (!student) {
    return null;
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={() => {
          if (!isSubmitting) {
            onDismiss();
          }
        }}
        contentContainerStyle={styles.modalContainer}
      >
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, tokens.spacing.xl) }]}>
          <View style={styles.handle} />

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Confirmar asistencia</Text>
            <Text style={styles.subtitle}>
              Verifica los datos del alumno antes de registrar el abordo.
            </Text>

            <View style={styles.studentHeader}>
              <View style={styles.studentAvatar}>
                <MaterialCommunityIcons
                  name="account"
                  size={tokens.fontSize["3xl"]}
                  color={colors.primaryIconContrast}
                />
              </View>
              <View style={styles.studentHeaderInfo}>
                <Text style={styles.studentName}>{student.nombre_alumno}</Text>
                <Text style={styles.studentStatus}>Pendiente de confirmación</Text>
              </View>
            </View>

            <StudentCard student={student} statusLabel="Pendiente de confirmación" />

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
                buttonColor={colors.primaryPressed}
              >
                Confirmar asistencia
              </Button>
              <Button
                mode="outlined"
                onPress={onDismiss}
                disabled={isSubmitting}
                contentStyle={styles.btnContent}
                style={styles.btnCancel}
              >
                Cancelar
              </Button>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Portal>
  );
}
