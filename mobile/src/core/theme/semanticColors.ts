/**
 * Semantic color tokens: every UI color resolves here per scheme.
 * Add new themes by extending ColorSchemeId and implementing a new palette object.
 */
export type ColorSchemeId = "light" | "dark";

export type SemanticColors = {
  screenSolid: string;
  screenGradient: readonly [string, string, string];
  headerGradient: readonly [string, string];

  textHero: string;
  textTitle: string;
  textSubtitle: string;
  textBody: string;
  textMuted: string;
  textInverse: string;
  textLink: string;
  textOnPrimary: string;

  borderDefault: string;
  borderMuted: string;
  borderHighlight: string;
  shadowColor: string;

  surfaceGlass: string;
  surfaceGlassBorder: string;
  surfaceCard: string;
  surfaceCardBorder: string;
  surfaceTrack: string;
  surfaceDivider: string;
  surfaceListItem: string;

  primary: string;
  primaryPressed: string;
  primarySoftBg: string;
  primarySoftText: string;
  primaryIconContrast: string;

  /** Amarillo del borde del escudo municipal */
  accent: string;
  accentOn: string;
  accentSoftBg: string;

  /** Celeste del cielo/corona del escudo */
  sky: string;
  skySoftBg: string;

  /** Barra superior de navegación */
  navHeaderBg: string;

  ctaGradient: readonly [string, string];

  tabBarBg: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;

  navHeaderTitle: string;
  navHeaderSubtitle: string;
  navLogoWrapBg: string;
  navLogoWrapBorder: string;
  navBusIcon: string;
  navLogoutPillBg: string;
  navLogoutPillBorder: string;
  navLogoutIcon: string;
  navLogoutText: string;
  navTabRingActiveBg: string;
  navTabRingActiveBorder: string;

  authScreenGradient: readonly [string, string, string];
  authCardBg: string;
  authCardBorder: string;
  authCardShadow: string;
  authInputBg: string;
  authInputBorder: string;
  authInputBorderActive: string;
  authInputPlaceholder: string;
  authInputText: string;
  authCtaGradient: readonly [string, string];
  authCtaSolid: string;
  authCtaText: string;
  authIconMuted: string;
  authForgotPassword: string;
  authFooter: string;
  authBottomNote: string;

  loadingGradient: readonly [string, string, string];
  loadingBg: string;
  loadingGlowBlue: string;
  loadingGlowPurple: string;
  loadingDot: string;

  feedbackError: string;
  feedbackSuccess: string;
  feedbackWarningBg: string;
  feedbackWarningBorder: string;
  feedbackWarningIconCircle: string;
  feedbackWarningTitle: string;
  feedbackWarningBody: string;
  feedbackWarningGlyph: string;

  tripSelectorIdleText: string;
  tripActionOutlineText: string;

  scannerRootBg: string;
  scannerScreenContainerBg: string;
  scannerBadgeBg: string;
  scannerBadgeText: string;
  scannerCameraBg: string;
  scannerCameraBorder: string;
  scannerCameraShadow: string;
  scannerOverlay: string;
  scannerCorner: string;
  scannerScanLine: string;
  scannerHintText: string;
  scannerHintPillBg: string;
  scannerPanelBg: string;
  scannerPanelBorder: string;
  scannerMatchContainerBg: string;
  scannerMatchItemBg: string;
  scannerSelectionBg: string;
  scannerSelectionLabel: string;
  scannerSelectionMuted: string;

  modalSheetBg: string;
  modalSheetBorder: string;
  modalHandle: string;
  modalTitle: string;
  modalSubtitle: string;
  modalStudentBannerBg: string;
  modalAvatarBg: string;
  modalName: string;
  modalStatus: string;

  attendancePending: string;
  attendanceOnboard: string;
  attendanceCompleted: string;
  attendanceLabel: string;

  statusBadgeBg: string;
  statusBadgeText: string;
  statusBadgeActiveBg: string;
  statusSuccessText: string;

  switchTrackOff: string;
  switchTrackOn: string;
  switchThumb: string;

  /** Control segmentado claro/oscuro (navbar y formularios) */
  appearanceControlBg: string;
  appearanceControlBorder: string;
  appearanceControlKnob: string;
  appearanceControlKnobBorder: string;
  appearanceControlIconActive: string;
  appearanceControlIconMuted: string;
};

export const lightSemanticColors: SemanticColors = {
  screenSolid: "#F2F5FA",
  screenGradient: ["#F2F5FA", "#F2F5FA", "#F2F5FA"],
  headerGradient: ["#FFFFFF", "#FFFFFF"],

  textHero: "#1C3284",
  textTitle: "#1C3284",
  textSubtitle: "#3A4A6B",
  textBody: "#3A4A6B",
  textMuted: "#6A7A94",
  textInverse: "#FFFFFF",
  textLink: "#1C3284",
  textOnPrimary: "#FFFFFF",

  borderDefault: "rgba(28, 50, 132, 0.14)",
  borderMuted: "rgba(28, 50, 132, 0.08)",
  borderHighlight: "rgba(255, 204, 0, 0.7)",
  shadowColor: "rgba(28, 50, 132, 0.08)",

  surfaceGlass: "#FFFFFF",
  surfaceGlassBorder: "rgba(28, 50, 132, 0.1)",
  surfaceCard: "#FFFFFF",
  surfaceCardBorder: "rgba(28, 50, 132, 0.12)",
  surfaceTrack: "#E6EBF4",
  surfaceDivider: "rgba(28, 50, 132, 0.08)",
  surfaceListItem: "#FFFFFF",

  primary: "#1C3284",
  primaryPressed: "#152766",
  primarySoftBg: "rgba(28, 50, 132, 0.1)",
  primarySoftText: "#1C3284",
  primaryIconContrast: "#FFFFFF",

  accent: "#FFCC00",
  accentOn: "#1C3284",
  accentSoftBg: "rgba(255, 204, 0, 0.18)",
  sky: "#5DB8E5",
  skySoftBg: "rgba(93, 184, 229, 0.16)",
  navHeaderBg: "#FFFFFF",

  ctaGradient: ["#1C3284", "#152766"],

  tabBarBg: "#FFFFFF",
  tabBarBorder: "rgba(28, 50, 132, 0.1)",
  tabBarActive: "#1C3284",
  tabBarInactive: "#8A97AD",

  navHeaderTitle: "#1C3284",
  navHeaderSubtitle: "#5A6A84",
  navLogoWrapBg: "transparent",
  navLogoWrapBorder: "transparent",
  navBusIcon: "#1C3284",
  navLogoutPillBg: "rgba(28, 50, 132, 0.06)",
  navLogoutPillBorder: "rgba(28, 50, 132, 0.12)",
  navLogoutIcon: "#1C3284",
  navLogoutText: "#1C3284",
  navTabRingActiveBg: "rgba(255, 204, 0, 0.22)",
  navTabRingActiveBorder: "rgba(255, 204, 0, 0.65)",

  authScreenGradient: ["#1C3284", "#1C3284", "#F2F5FA"],
  authCardBg: "#FFFFFF",
  authCardBorder: "rgba(28, 50, 132, 0.12)",
  authCardShadow: "rgba(28, 50, 132, 0.06)",
  authInputBg: "#F8FAFD",
  authInputBorder: "#C5CED8",
  authInputBorderActive: "#1C3284",
  authInputPlaceholder: "#8A97AD",
  authInputText: "#1C3284",
  authCtaGradient: ["#1C3284", "#152766"],
  authCtaSolid: "#1C3284",
  authCtaText: "#FFFFFF",
  authIconMuted: "#8A97AD",
  authForgotPassword: "#1C3284",
  authFooter: "#8A97AD",
  authBottomNote: "#6A7A94",

  loadingGradient: ["#F2F5FA", "#F2F5FA", "#F2F5FA"],
  loadingBg: "#F2F5FA",
  loadingGlowBlue: "rgba(93, 184, 229, 0.12)",
  loadingGlowPurple: "rgba(255, 204, 0, 0.08)",
  loadingDot: "#1C3284",

  feedbackError: "#C53030",
  feedbackSuccess: "#2F855A",
  feedbackWarningBg: "rgba(93, 184, 229, 0.14)",
  feedbackWarningBorder: "rgba(93, 184, 229, 0.35)",
  feedbackWarningIconCircle: "rgba(93, 184, 229, 0.22)",
  feedbackWarningTitle: "#1C3284",
  feedbackWarningBody: "#3A4A6B",
  feedbackWarningGlyph: "#5DB8E5",

  tripSelectorIdleText: "#3A4A6B",
  tripActionOutlineText: "#1C3284",

  scannerRootBg: "#E8EDF5",
  scannerScreenContainerBg: "#E8EDF5",
  scannerBadgeBg: "rgba(28, 50, 132, 0.1)",
  scannerBadgeText: "#1C3284",
  scannerCameraBg: "#152766",
  scannerCameraBorder: "rgba(255, 204, 0, 0.75)",
  scannerCameraShadow: "#152766",
  scannerOverlay: "rgba(21, 39, 102, 0.14)",
  scannerCorner: "#FFCC00",
  scannerScanLine: "#FFCC00",
  scannerHintText: "#FFFFFF",
  scannerHintPillBg: "rgba(28, 50, 132, 0.9)",
  scannerPanelBg: "#FFFFFF",
  scannerPanelBorder: "rgba(28, 50, 132, 0.1)",
  scannerMatchContainerBg: "rgba(28, 50, 132, 0.04)",
  scannerMatchItemBg: "rgba(28, 50, 132, 0.06)",
  scannerSelectionBg: "rgba(93, 184, 229, 0.14)",
  scannerSelectionLabel: "#152766",
  scannerSelectionMuted: "#6A7A94",

  modalSheetBg: "#FFFFFF",
  modalSheetBorder: "rgba(28, 50, 132, 0.12)",
  modalHandle: "rgba(255, 204, 0, 0.75)",
  modalTitle: "#1C3284",
  modalSubtitle: "#6A7A94",
  modalStudentBannerBg: "#1C3284",
  modalAvatarBg: "#152766",
  modalName: "#FFFFFF",
  modalStatus: "rgba(255, 255, 255, 0.82)",

  attendancePending: "#C53030",
  attendanceOnboard: "#1C3284",
  attendanceCompleted: "#2F855A",
  attendanceLabel: "#FFFFFF",

  statusBadgeBg: "rgba(93, 184, 229, 0.18)",
  statusBadgeText: "#1C3284",
  statusBadgeActiveBg: "rgba(255, 204, 0, 0.28)",
  statusSuccessText: "#152766",

  switchTrackOff: "#C5CED8",
  switchTrackOn: "rgba(28, 50, 132, 0.35)",
  switchThumb: "#FFFFFF",

  appearanceControlBg: "rgba(28, 50, 132, 0.06)",
  appearanceControlBorder: "rgba(28, 50, 132, 0.12)",
  appearanceControlKnob: "#FFFFFF",
  appearanceControlKnobBorder: "rgba(28, 50, 132, 0.1)",
  appearanceControlIconActive: "#1C3284",
  appearanceControlIconMuted: "#8A97AD",
};

export const darkSemanticColors: SemanticColors = {
  screenSolid: "#141820",
  screenGradient: ["#141820", "#141820", "#141820"],
  headerGradient: ["#1C2130", "#1C2130"],

  textHero: "#ECEFF4",
  textTitle: "#ECEFF4",
  textSubtitle: "#A8B0C2",
  textBody: "#A8B0C2",
  textMuted: "#7A8499",
  textInverse: "#FFFFFF",
  textLink: "#6BBDE8",
  textOnPrimary: "#FFFFFF",

  borderDefault: "rgba(255, 255, 255, 0.09)",
  borderMuted: "rgba(255, 255, 255, 0.05)",
  borderHighlight: "rgba(255, 204, 0, 0.4)",
  shadowColor: "#000000",

  surfaceGlass: "#1C2130",
  surfaceGlassBorder: "rgba(255, 255, 255, 0.07)",
  surfaceCard: "#1C2130",
  surfaceCardBorder: "rgba(255, 255, 255, 0.07)",
  surfaceTrack: "#252B3A",
  surfaceDivider: "rgba(255, 255, 255, 0.05)",
  surfaceListItem: "#1C2130",

  primary: "#2E4A9A",
  primaryPressed: "#243D82",
  primarySoftBg: "rgba(46, 74, 154, 0.22)",
  primarySoftText: "#8EB4E8",
  primaryIconContrast: "#FFFFFF",

  accent: "#E6B800",
  accentOn: "#141820",
  accentSoftBg: "rgba(230, 184, 0, 0.12)",
  sky: "#6BBDE8",
  skySoftBg: "rgba(107, 189, 232, 0.12)",
  navHeaderBg: "#1C2130",

  ctaGradient: ["#2E4A9A", "#243D82"],

  tabBarBg: "#1C2130",
  tabBarBorder: "rgba(255, 255, 255, 0.07)",
  tabBarActive: "#ECEFF4",
  tabBarInactive: "#7A8499",

  navHeaderTitle: "#ECEFF4",
  navHeaderSubtitle: "#8A94A8",
  navLogoWrapBg: "transparent",
  navLogoWrapBorder: "transparent",
  navBusIcon: "#6BBDE8",
  navLogoutPillBg: "transparent",
  navLogoutPillBorder: "transparent",
  navLogoutIcon: "#C5CDD9",
  navLogoutText: "#C5CDD9",
  navTabRingActiveBg: "rgba(107, 189, 232, 0.14)",
  navTabRingActiveBorder: "rgba(107, 189, 232, 0.35)",

  authScreenGradient: ["#1C3284", "#1C3284", "#141820"],
  authCardBg: "#1C2130",
  authCardBorder: "rgba(255, 255, 255, 0.08)",
  authCardShadow: "#000000",
  authInputBg: "#252B3A",
  authInputBorder: "#353D50",
  authInputBorderActive: "#2E4A9A",
  authInputPlaceholder: "#7A8499",
  authInputText: "#ECEFF4",
  authCtaGradient: ["#2E4A9A", "#243D82"],
  authCtaSolid: "#2E4A9A",
  authCtaText: "#FFFFFF",
  authIconMuted: "#7A8499",
  authForgotPassword: "#6BBDE8",
  authFooter: "#7A8499",
  authBottomNote: "#6A7488",

  loadingGradient: ["#141820", "#141820", "#141820"],
  loadingBg: "#141820",
  loadingGlowBlue: "rgba(107, 189, 232, 0.1)",
  loadingGlowPurple: "rgba(230, 184, 0, 0.06)",
  loadingDot: "#6BBDE8",

  feedbackError: "#F08080",
  feedbackSuccess: "#5CB88A",
  feedbackWarningBg: "rgba(107, 189, 232, 0.1)",
  feedbackWarningBorder: "rgba(107, 189, 232, 0.22)",
  feedbackWarningIconCircle: "rgba(107, 189, 232, 0.15)",
  feedbackWarningTitle: "#6BBDE8",
  feedbackWarningBody: "#A8B0C2",
  feedbackWarningGlyph: "#6BBDE8",

  tripSelectorIdleText: "#A8B0C2",
  tripActionOutlineText: "#8EB4E8",

  scannerRootBg: "#141820",
  scannerScreenContainerBg: "#141820",
  scannerBadgeBg: "rgba(46, 74, 154, 0.22)",
  scannerBadgeText: "#8EB4E8",
  scannerCameraBg: "#0E1118",
  scannerCameraBorder: "rgba(230, 184, 0, 0.45)",
  scannerCameraShadow: "#000000",
  scannerOverlay: "rgba(0, 0, 0, 0.28)",
  scannerCorner: "#E6B800",
  scannerScanLine: "#E6B800",
  scannerHintText: "#ECEFF4",
  scannerHintPillBg: "rgba(28, 33, 48, 0.92)",
  scannerPanelBg: "#1C2130",
  scannerPanelBorder: "rgba(255, 255, 255, 0.07)",
  scannerMatchContainerBg: "rgba(255, 255, 255, 0.03)",
  scannerMatchItemBg: "rgba(255, 255, 255, 0.05)",
  scannerSelectionBg: "rgba(107, 189, 232, 0.12)",
  scannerSelectionLabel: "#ECEFF4",
  scannerSelectionMuted: "#7A8499",

  modalSheetBg: "#1C2130",
  modalSheetBorder: "rgba(255, 255, 255, 0.08)",
  modalHandle: "rgba(230, 184, 0, 0.45)",
  modalTitle: "#ECEFF4",
  modalSubtitle: "#7A8499",
  modalStudentBannerBg: "#243D82",
  modalAvatarBg: "#2E4A9A",
  modalName: "#FFFFFF",
  modalStatus: "rgba(255, 255, 255, 0.75)",

  attendancePending: "#E05C5C",
  attendanceOnboard: "#2E4A9A",
  attendanceCompleted: "#5CB88A",
  attendanceLabel: "#FFFFFF",

  statusBadgeBg: "rgba(107, 189, 232, 0.12)",
  statusBadgeText: "#A8B0C2",
  statusBadgeActiveBg: "rgba(92, 184, 138, 0.18)",
  statusSuccessText: "#5CB88A",

  switchTrackOff: "#353D50",
  switchTrackOn: "rgba(46, 74, 154, 0.45)",
  switchThumb: "#ECEFF4",

  appearanceControlBg: "transparent",
  appearanceControlBorder: "transparent",
  appearanceControlKnob: "transparent",
  appearanceControlKnobBorder: "transparent",
  appearanceControlIconActive: "#E6B800",
  appearanceControlIconMuted: "#7A8499",
};

/** Legibilidad en sol directo (parabrisas). Solo aplica sobre tema claro. */
export const highContrastSemanticColors: SemanticColors = {
  ...lightSemanticColors,
  screenSolid: "#FFFFFF",
  screenGradient: ["#FFFFFF", "#FFFFFF", "#FFFFFF"],
  headerGradient: ["#FFFFFF", "#FFFFFF"],

  textHero: "#000000",
  textTitle: "#000000",
  textSubtitle: "#1A1A1A",
  textBody: "#1A1A1A",
  textMuted: "#333333",

  borderDefault: "rgba(0, 0, 0, 0.35)",
  borderMuted: "rgba(0, 0, 0, 0.22)",
  borderHighlight: "#FFCC00",

  surfaceTrack: "#D8DEE8",
  surfaceCard: "#FFFFFF",
  surfaceCardBorder: "rgba(0, 0, 0, 0.28)",
  surfaceDivider: "rgba(0, 0, 0, 0.18)",
  surfaceListItem: "#FFFFFF",

  primarySoftBg: "#D4DCF0",
  primarySoftText: "#1C3284",

  tabBarInactive: "#444444",
  tabBarBorder: "rgba(0, 0, 0, 0.25)",

  navHeaderSubtitle: "#333333",

  tripSelectorIdleText: "#333333",
  tripActionOutlineText: "#1C3284",

  scannerRootBg: "#FFFFFF",
  scannerScreenContainerBg: "#FFFFFF",
  scannerSelectionMuted: "#333333",
  scannerSelectionLabel: "#1C3284",
  scannerBadgeText: "#1C3284",
  scannerHintText: "#FFFFFF",
  scannerOverlay: "rgba(0, 0, 0, 0.28)",

  feedbackWarningBg: "rgba(255, 204, 0, 0.28)",
  feedbackWarningBorder: "rgba(0, 0, 0, 0.35)",
  feedbackWarningTitle: "#000000",
  feedbackWarningBody: "#1A1A1A",
  feedbackWarningGlyph: "#1C3284",

  modalSubtitle: "#333333",
  authFooter: "#333333",
  authBottomNote: "#333333",
  authInputPlaceholder: "#444444",
  authIconMuted: "#444444",

  sky: "#1C3284",

  statusBadgeText: "#1C3284",
  statusBadgeBg: "rgba(93, 184, 229, 0.35)",

  attendancePending: "#B91C1C",
  attendanceOnboard: "#1C3284",
  attendanceCompleted: "#166534",
  attendanceLabel: "#FFFFFF",
};

export function getSemanticColors(
  scheme: ColorSchemeId,
  highContrast = false,
): SemanticColors {
  if (scheme === "dark") {
    return darkSemanticColors;
  }
  return highContrast ? highContrastSemanticColors : lightSemanticColors;
}
