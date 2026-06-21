import { StyleSheet } from "react-native";

import type { AppThemeContextValue } from "@/src/core/theme/ThemeProvider";

const CONTENT_MAX_WIDTH = 520;
const CAMERA_MAX_WIDTH = 400;

export function createScannerScreenStyles(
  colors: AppThemeContextValue["colors"],
  tokens: AppThemeContextValue["tokens"],
  compact: boolean,
) {
  const cameraHeight = compact ? 300 : 340;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.screenSolid,
    },
    screenContainer: {
      flex: 1,
      paddingHorizontal: compact ? tokens.spacing.lg : tokens.spacing.xl,
      paddingTop: tokens.spacing.md,
      maxWidth: CONTENT_MAX_WIDTH,
      width: "100%",
      alignSelf: "center",
    },
    statusContainer: {
      flex: 1,
      paddingHorizontal: tokens.spacing.lg,
      paddingTop: tokens.spacing.md,
      paddingBottom: tokens.layout.scrollBottomInset,
    },
    statusCard: {
      flex: 1,
    },
    topChrome: {
      gap: tokens.spacing.md,
      flexShrink: 0,
    },
    modeBar: {
      flexDirection: "row",
      backgroundColor: colors.surfaceTrack,
      borderRadius: tokens.radius.full,
      padding: tokens.spacing.xs,
      gap: tokens.spacing.xs,
    },
    modeButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: tokens.spacing.sm,
      paddingVertical: tokens.spacing.sm + 2,
      paddingHorizontal: tokens.spacing.md,
      borderRadius: tokens.radius.full,
    },
    modeButtonActive: {
      backgroundColor: colors.surfaceCard,
      shadowColor: colors.scannerCameraShadow,
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    modeButtonLabel: {
      ...tokens.typography.bodyStrong,
      color: colors.textMuted,
    },
    modeButtonLabelActive: {
      color: colors.textTitle,
    },
    modeHint: {
      ...tokens.typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 18,
    },
    scannerBody: {
      flex: 1,
      minHeight: 0,
      width: "100%",
      marginTop: tokens.spacing.md,
    },
    cameraSlot: {
      width: "100%",
      maxWidth: CAMERA_MAX_WIDTH,
      height: cameraHeight,
      alignSelf: "center",
      flexShrink: 0,
    },
    feedbackDock: {
      flex: 1,
      minHeight: 0,
      marginTop: tokens.spacing.md,
    },
    feedbackScrollContent: {
      flexGrow: 1,
      gap: tokens.spacing.sm,
    },
    manualScroll: {
      flex: 1,
      minHeight: 0,
      marginTop: tokens.spacing.md,
    },
    manualScrollContent: {
      flexGrow: 1,
      gap: tokens.spacing.md,
    },
    panelFill: {
      alignItems: "center",
      width: "100%",
    },
    cameraPlaceholder: {
      flex: 1,
      width: "100%",
      borderRadius: tokens.radius.xl,
      backgroundColor: colors.scannerCameraBg,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      alignItems: "center",
      justifyContent: "center",
      gap: tokens.spacing.sm,
      padding: tokens.spacing.lg,
    },
    cameraPlaceholderText: {
      ...tokens.typography.body,
      color: colors.textMuted,
      textAlign: "center",
    },
  });
}
