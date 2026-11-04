import { useCallback, useMemo } from "react";
import { ActivityIndicator, RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { PARENT_ROUTES } from "@/src/core/routes";
import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { ChildStatusCard } from "@/src/features/parent/components/ChildStatusCard";
import { ParentEmptyState } from "@/src/features/parent/components/ParentEmptyState";
import { useParentChildren } from "@/src/features/parent/hooks/useParentChildren";
import { useProfile } from "@/src/features/profile/hooks/useProfile";
import { AppScrollView } from "@/src/shared/ui/AppScrollView";
import { WaveHeader } from "@/src/shared/ui/WaveHeader";

export default function ParentHomeScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { children, loading, refreshing, error, refresh } = useParentChildren();
  const { displayName } = useProfile();
  const firstName = displayName?.split(" ")[0];
  const headerTitle = firstName ? `Hola, ${firstName}` : "Mis hijos";

  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleOpenChild = useCallback(
    (studentId: string) => {
      router.push(PARENT_ROUTES.child(studentId));
    },
    [router],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: colors.screenSolid,
        },
        loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        },
        content: {
          paddingHorizontal: tokens.spacing.lg,
          gap: tokens.spacing.lg,
        },
        list: {
          gap: tokens.spacing.md,
        },
        error: {
          ...tokens.typography.body,
          color: colors.feedbackError,
          textAlign: "center",
        },
      }),
    [colors, tokens],
  );

  if (loading) {
    return (
      <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
        <WaveHeader title={headerTitle} subtitle="Apoderado" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating size={36} color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
      <WaveHeader title={headerTitle} subtitle="Apoderado" />
      <AppScrollView
        contentContainerStyle={styles.content}
        extraBottomInset={tokens.spacing.lg}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!children.length && error ? null : !children.length ? (
          <ParentEmptyState
            title="Sin hijos vinculados"
            message="Contacta a la municipalidad para vincular tu cuenta con los alumnos a tu cargo."
          />
        ) : (
          <View style={styles.list}>
            {children.map((item) => (
              <ChildStatusCard
                key={item.student.id}
                item={item}
                onOpenChild={handleOpenChild}
                studentId={item.student.id}
              />
            ))}
          </View>
        )}
      </AppScrollView>
    </SafeAreaView>
  );
}
