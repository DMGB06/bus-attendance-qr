import { StyleSheet } from 'react-native';

import type { AppThemeContextValue } from '@/src/core/theme/ThemeProvider';

export function createTripScreenStyles(
  colors: AppThemeContextValue['colors'],
  tokens: AppThemeContextValue['tokens'],
  compact = false,
) {
  const screenPadding = compact ? tokens.spacing.md : tokens.spacing.lg;
  const sectionGap = compact ? tokens.spacing.md : tokens.spacing.lg;
  const cardPadding = compact ? tokens.spacing.lg : tokens.spacing.xl;
  const actionHeight = compact ? tokens.layout.buttonHeight - 8 : tokens.layout.buttonHeight - 4;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.screenSolid,
    },
    container: {
      flexGrow: 1,
      paddingHorizontal: screenPadding,
      paddingBottom: tokens.spacing.lg,
      gap: sectionGap,
      maxWidth: 520,
      width: '100%',
      alignSelf: 'center',
    },
    historyLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: tokens.spacing.xs,
      minHeight: tokens.layout.minTouchTarget,
    },
    historyLinkText: {
      ...tokens.typography.label,
      color: colors.textLink,
    },
    mainCard: {
      backgroundColor: colors.surfaceCard,
      borderRadius: tokens.radius.lg,
      padding: cardPadding,
      gap: sectionGap,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
    },
    sectionLabel: {
      ...tokens.typography.label,
      color: colors.textMuted,
    },
    selectorContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceTrack,
      padding: tokens.spacing.xs,
      borderRadius: tokens.radius.md,
      gap: tokens.spacing.xs,
    },
    selectorButton: {
      flex: 1,
      height: actionHeight,
      borderRadius: tokens.radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: tokens.spacing.sm,
    },
    selectorButtonActive: {
      backgroundColor: colors.primary,
    },
    selectorText: {
      ...tokens.typography.bodyStrong,
    },
    selectorLabelActive: {
      color: colors.textInverse,
    },
    selectorLabelIdle: {
      color: colors.tripSelectorIdleText,
    },
    afternoonList: {
      gap: tokens.spacing.sm,
    },
    afternoonOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: compact ? tokens.spacing.sm : tokens.spacing.md,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      borderColor: colors.borderMuted,
      backgroundColor: colors.surfaceTrack,
    },
    afternoonOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoftBg,
    },
    afternoonOptionBody: {
      flex: 1,
      gap: 2,
    },
    afternoonOptionTitle: {
      ...tokens.typography.bodyStrong,
      color: colors.textTitle,
    },
    afternoonOptionTitleActive: {
      color: colors.primarySoftText,
    },
    afternoonOptionHint: {
      ...tokens.typography.caption,
      color: colors.textMuted,
    },
    errorText: {
      marginTop: -tokens.spacing.sm,
    },
    warning: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.sm,
      backgroundColor: colors.skySoftBg,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      borderColor: colors.feedbackWarningBorder,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm,
    },
    warningBody: {
      ...tokens.typography.caption,
      color: colors.feedbackWarningBody,
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    scroll: {
      flex: 1,
    },
    activeScrollBody: {
      paddingHorizontal: screenPadding,
      gap: tokens.spacing.md,
      maxWidth: 520,
      width: '100%',
      alignSelf: 'center',
    },
    closeSuccessBanner: {
      backgroundColor: colors.statusCompletedBg,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.sm,
    },
    closeSuccessText: {
      ...tokens.typography.body,
      color: colors.statusCompletedText,
      flex: 1,
    },
    startingShell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: tokens.spacing.md,
      paddingHorizontal: screenPadding,
    },
    startingText: {
      ...tokens.typography.body,
      color: colors.textMuted,
    },
  });
}
