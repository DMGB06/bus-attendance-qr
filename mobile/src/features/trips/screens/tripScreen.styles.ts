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
      borderRadius: tokens.radius.full,
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
    morningHint: {
      ...tokens.typography.body,
      color: colors.textBody,
      backgroundColor: colors.skySoftBg,
      borderRadius: tokens.radius.md,
      padding: tokens.spacing.md,
    },
    infoContainer: {
      gap: tokens.spacing.md,
      paddingTop: tokens.spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.borderMuted,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.sm,
    },
    infoText: {
      ...tokens.typography.body,
      color: colors.textBody,
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
      alignItems: 'flex-start',
      gap: tokens.spacing.md,
      backgroundColor: colors.skySoftBg,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      borderColor: colors.feedbackWarningBorder,
      padding: tokens.spacing.lg,
    },
    warningIcon: {
      width: 36,
      height: 36,
      borderRadius: tokens.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.feedbackWarningIconCircle,
    },
    warningText: {
      flex: 1,
      gap: tokens.spacing.xs,
    },
    warningTitle: {
      ...tokens.typography.label,
      color: colors.feedbackWarningTitle,
    },
    warningBody: {
      ...tokens.typography.body,
      color: colors.feedbackWarningBody,
    },
    scrollContent: {
      flexGrow: 1,
    },
  });
}
