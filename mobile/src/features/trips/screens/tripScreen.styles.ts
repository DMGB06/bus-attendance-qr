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
  const stickyActionHeight = compact ? 40 : 42;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.screenSolid,
    },
    container: {
      flexGrow: 1,
      paddingHorizontal: screenPadding,
      paddingTop: compact ? tokens.spacing.sm : tokens.spacing.md,
      paddingBottom: tokens.spacing.lg,
      gap: sectionGap,
      maxWidth: 520,
      width: '100%',
      alignSelf: 'center',
    },
    pageHeader: {
      alignItems: 'center',
      gap: compact ? tokens.spacing.xs : tokens.spacing.sm,
    },
    tripMeta: {
      ...tokens.typography.caption,
      color: colors.textMuted,
      textAlign: 'center',
    },
    historyLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: tokens.spacing.xs,
      marginTop: tokens.spacing.xs,
      paddingVertical: compact ? tokens.spacing.xs : tokens.spacing.sm,
      paddingHorizontal: tokens.spacing.md,
      borderRadius: tokens.radius.sm,
      backgroundColor: colors.primarySoftBg,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      alignSelf: 'stretch',
    },
    historyLinkText: {
      ...tokens.typography.label,
      color: colors.primary,
      flex: 1,
      textAlign: 'center',
    },
    title: {
      ...(compact ? tokens.typography.title2 : tokens.typography.title1),
      color: colors.textHero,
      textAlign: 'center',
    },
    subtitle: {
      ...tokens.typography.body,
      color: colors.textMuted,
      textAlign: 'center',
    },
    mainCard: {
      backgroundColor: colors.surfaceCard,
      borderRadius: tokens.radius.lg,
      padding: cardPadding,
      gap: sectionGap,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      borderTopWidth: 4,
      borderTopColor: colors.accent,
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
    selectorButtonDisabled: {
      opacity: 0.45,
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
    afternoonOptionDisabled: {
      opacity: 0.45,
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
    morningHint: {
      ...tokens.typography.body,
      color: colors.textBody,
      backgroundColor: colors.skySoftBg,
      borderRadius: tokens.radius.md,
      padding: tokens.spacing.md,
    },
    startButton: {
      borderRadius: tokens.radius.md,
    },
    startButtonContent: {
      height: actionHeight,
    },
    startButtonLabel: {
      ...tokens.typography.bodyStrong,
      color: colors.textOnPrimary,
    },
    errorText: {
      marginTop: -tokens.spacing.sm,
    },
    activeActions: {
      gap: compact ? tokens.spacing.sm : tokens.spacing.md,
      paddingTop: tokens.spacing.xs,
    },
    statsRow: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: tokens.radius.md,
      overflow: 'hidden',
    },
    statChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: compact ? tokens.spacing.sm : tokens.spacing.md,
      gap: 2,
    },
    statValue: {
      ...(compact ? tokens.typography.title3 : tokens.typography.title2),
      color: colors.textOnPrimary,
    },
    statLabel: {
      ...tokens.typography.overline,
      color: 'rgba(255, 255, 255, 0.75)',
      letterSpacing: 0.3,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: colors.borderMuted,
    },
    actionButton: {
      borderRadius: tokens.radius.md,
    },
    actionButtonContent: {
      height: actionHeight,
    },
    historyButton: {
      borderRadius: tokens.radius.md,
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
    activeTripShell: {
      flex: 1,
    },
    activeTripFixed: {
      paddingHorizontal: screenPadding,
      paddingTop: compact ? tokens.spacing.sm : tokens.spacing.md,
      gap: compact ? tokens.spacing.sm : tokens.spacing.md,
      maxWidth: 520,
      width: '100%',
      alignSelf: 'center',
    },
    pageHeaderCompact: {
      gap: 2,
    },
    titleCompact: {
      ...tokens.typography.title2,
      color: colors.textHero,
    },
    subtitleCompact: {
      ...tokens.typography.caption,
      color: colors.textMuted,
    },
    activeMainCard: {
      backgroundColor: colors.surfaceCard,
      borderRadius: tokens.radius.lg,
      padding: compact ? tokens.spacing.md : tokens.spacing.lg,
      gap: compact ? tokens.spacing.sm : tokens.spacing.md,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      borderTopWidth: 4,
      borderTopColor: colors.accent,
    },
    activeScrollBody: {
      paddingHorizontal: screenPadding,
      paddingTop: compact ? tokens.spacing.sm : tokens.spacing.md,
      gap: compact ? tokens.spacing.sm : tokens.spacing.md,
      maxWidth: 520,
      width: '100%',
      alignSelf: 'center',
    },
    primaryActionRow: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
    },
    primaryActionButton: {
      flex: 1,
      borderRadius: tokens.radius.md,
    },
    compactActionContent: {
      height: stickyActionHeight,
    },
    closeTripButton: {
      borderRadius: tokens.radius.md,
    },
    closeSuccessBanner: {
      backgroundColor: 'rgba(47, 133, 90, 0.1)',
      borderRadius: tokens.radius.xl,
      padding: tokens.spacing.md,
      borderWidth: 1,
      borderColor: colors.attendanceCompleted,
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.sm,
    },
    closeSuccessText: {
      ...tokens.typography.body,
      color: colors.attendanceCompleted,
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
