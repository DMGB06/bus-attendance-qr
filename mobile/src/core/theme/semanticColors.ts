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
  screenSolid: "#F1F5F9",
  screenGradient: ["#F8FAFC", "#EFF6FF", "#E8EEF5"],
  headerGradient: ["#F8FAFC", "#e0eaf9"],

  textHero: "#0F172A",
  textTitle: "#0F172A",
  textSubtitle: "#334155",
  textBody: "#334155",
  textMuted: "#64748B",
  textInverse: "#FFFFFF",
  textLink: "#1D4ED8",
  textOnPrimary: "#FFFFFF",

  borderDefault: "rgba(15, 23, 42, 0.12)",
  borderMuted: "rgba(15, 23, 42, 0.08)",
  borderHighlight: "rgba(37, 99, 235, 0.35)",
  shadowColor: "rgba(15, 23, 42, 0.12)",

  surfaceGlass: "#FFFFFF",
  surfaceGlassBorder: "rgba(15, 23, 42, 0.1)",
  surfaceCard: "#FFFFFF",
  surfaceCardBorder: "rgba(15, 23, 42, 0.08)",
  surfaceTrack: "#E2E8F0",
  surfaceDivider: "rgba(15, 23, 42, 0.08)",
  surfaceListItem: "#FFFFFF",

  primary: "#2563EB",
  primaryPressed: "#1D4ED8",
  primarySoftBg: "rgba(37, 99, 235, 0.12)",
  primarySoftText: "#1D4ED8",
  primaryIconContrast: "#FFFFFF",

  ctaGradient: ["#3B82F6", "#2563EB"],

  tabBarBg: "rgba(255, 255, 255, 0.96)",
  tabBarBorder: "rgba(15, 23, 42, 0.08)",
  tabBarActive: "#2563EB",
  tabBarInactive: "#64748B",

  navHeaderTitle: "#0F172A",
  navHeaderSubtitle: "#64748B",
  navLogoWrapBg: "rgba(37, 99, 235, 0.12)",
  navLogoWrapBorder: "rgba(15, 23, 42, 0.08)",
  navBusIcon: "#1D4ED8",
  navLogoutPillBg: "rgba(15, 23, 42, 0.04)",
  navLogoutPillBorder: "rgba(15, 23, 42, 0.1)",
  navLogoutIcon: "#475569",
  navLogoutText: "#475569",
  navTabRingActiveBg: "rgba(37, 99, 235, 0.12)",
  navTabRingActiveBorder: "rgba(37, 99, 235, 0.35)",

  authScreenGradient: ["#FFFFFF", "#F1F5F9", "#E8EEF5"],
  authCardBg: "#FFFFFF",
  authCardBorder: "rgba(15, 23, 42, 0.1)",
  authCardShadow: "rgba(15, 23, 42, 0.12)",
  authInputBg: "#F8FAFC",
  authInputBorder: "#CBD5E1",
  authInputBorderActive: "#2563EB",
  authInputPlaceholder: "#64748B",
  authInputText: "#0F172A",
  authCtaGradient: ["#3B82F6", "#2563EB"],
  authCtaSolid: "#2563EB",
  authCtaText: "#F8FAFC",
  authIconMuted: "#64748B",
  authForgotPassword: "#2563EB",
  authFooter: "#64748B",
  authBottomNote: "#475569",

  loadingGradient: ["#F8FAFC", "#EFF6FF", "#E2E8F0"],
  loadingBg: "#F8FAFC",
  loadingGlowBlue: "rgba(37, 99, 235, 0.14)",
  loadingGlowPurple: "rgba(124, 58, 237, 0.08)",
  loadingDot: "#2563EB",

  feedbackError: "#DC2626",
  feedbackSuccess: "#16A34A",
  feedbackWarningBg: "rgba(245, 158, 11, 0.12)",
  feedbackWarningBorder: "rgba(217, 119, 6, 0.35)",
  feedbackWarningIconCircle: "rgba(245, 158, 11, 0.2)",
  feedbackWarningTitle: "#B45309",
  feedbackWarningBody: "#334155",
  feedbackWarningGlyph: "#CA8A04",

  tripSelectorIdleText: "#334155",
  tripActionOutlineText: "#1E40AF",

  scannerRootBg: "#EEF2F7",
  scannerScreenContainerBg: "#EEF2F7",
  scannerBadgeBg: "rgba(37, 99, 235, 0.12)",
  scannerBadgeText: "#1D4ED8",
  scannerCameraBg: "#FFFFFF",
  scannerCameraBorder: "rgba(37, 99, 235, 0.35)",
  scannerCameraShadow: "#2563EB",
  scannerOverlay: "rgba(15, 23, 42, 0.08)",
  scannerCorner: "#2563EB",
  scannerScanLine: "#3B82F6",
  scannerHintText: "#0F172A",
  scannerHintPillBg: "rgba(255, 255, 255, 0.92)",
  scannerPanelBg: "#FFFFFF",
  scannerPanelBorder: "rgba(15, 23, 42, 0.08)",
  scannerMatchContainerBg: "rgba(15, 23, 42, 0.04)",
  scannerMatchItemBg: "rgba(15, 23, 42, 0.06)",
  scannerSelectionBg: "rgba(37, 99, 235, 0.1)",
  scannerSelectionLabel: "#1E3A8A",
  scannerSelectionMuted: "#64748B",

  modalSheetBg: "#FFFFFF",
  modalSheetBorder: "rgba(15, 23, 42, 0.1)",
  modalHandle: "rgba(15, 23, 42, 0.2)",
  modalTitle: "#0F172A",
  modalSubtitle: "#64748B",
  modalStudentBannerBg: "rgba(37, 99, 235, 0.1)",
  modalAvatarBg: "#2563EB",
  modalName: "#0F172A",
  modalStatus: "#1D4ED8",

  attendancePending: "#B91C1C",
  attendanceOnboard: "#1D4ED8",
  attendanceCompleted: "#166534",
  attendanceLabel: "#FFFFFF",

  statusBadgeBg: "rgba(100, 116, 139, 0.18)",
  statusBadgeText: "#475569",
  statusBadgeActiveBg: "rgba(22, 163, 74, 0.18)",
  statusSuccessText: "#15803D",

  switchTrackOff: "#CBD5E1",
  switchTrackOn: "#93C5FD",
  switchThumb: "#FFFFFF",

  appearanceControlBg: "rgba(15, 23, 42, 0.06)",
  appearanceControlBorder: "rgba(15, 23, 42, 0.12)",
  appearanceControlKnob: "#FFFFFF",
  appearanceControlKnobBorder: "rgba(15, 23, 42, 0.1)",
  appearanceControlIconActive: "#1D4ED8",
  appearanceControlIconMuted: "#94A3B8",
};

export const darkSemanticColors: SemanticColors = {
  screenSolid: "#0B1020",
  screenGradient: ["#0B1020", "#111827", "#0A1222"],
  headerGradient: ["#0B1020", "#111827"],

  textHero: "#F8FAFC",
  textTitle: "#F8FAFC",
  textSubtitle: "#CBD5E1",
  textBody: "#CBD5E1",
  textMuted: "#94A3B8",
  textInverse: "#FFFFFF",
  textLink: "#93C5FD",
  textOnPrimary: "#FFFFFF",

  borderDefault: "rgba(255, 255, 255, 0.08)",
  borderMuted: "rgba(255, 255, 255, 0.06)",
  borderHighlight: "rgba(96, 165, 250, 0.35)",
  shadowColor: "#000000",

  surfaceGlass: "rgba(22, 28, 45, 0.88)",
  surfaceGlassBorder: "rgba(255, 255, 255, 0.06)",
  surfaceCard: "rgba(255, 255, 255, 0.04)",
  surfaceCardBorder: "rgba(255, 255, 255, 0.06)",
  surfaceTrack: "rgba(255, 255, 255, 0.04)",
  surfaceDivider: "rgba(255, 255, 255, 0.06)",
  surfaceListItem: "#1E293B",

  primary: "#3B82F6",
  primaryPressed: "#2563EB",
  primarySoftBg: "rgba(59, 130, 246, 0.14)",
  primarySoftText: "#93C5FD",
  primaryIconContrast: "#FFFFFF",

  ctaGradient: ["#3B82F6", "#2563EB"],

  tabBarBg: "rgba(11, 16, 32, 0.96)",
  tabBarBorder: "rgba(255, 255, 255, 0.05)",
  tabBarActive: "#3B82F6",
  tabBarInactive: "#94A3B8",

  navHeaderTitle: "#EAF1FF",
  navHeaderSubtitle: "#7C8AA5",
  navLogoWrapBg: "rgba(59, 130, 246, 0.14)",
  navLogoWrapBorder: "rgba(255, 255, 255, 0.06)",
  navBusIcon: "#BFDBFE",
  navLogoutPillBg: "rgba(255, 255, 255, 0.04)",
  navLogoutPillBorder: "rgba(255, 255, 255, 0.05)",
  navLogoutIcon: "#94A3B8",
  navLogoutText: "#94A3B8",
  navTabRingActiveBg: "rgba(59, 130, 246, 0.14)",
  navTabRingActiveBorder: "rgba(59, 130, 246, 0.18)",

  authScreenGradient: ["#0F172A", "#111827", "#0F141D"],
  authCardBg: "rgba(15, 23, 42, 0.92)",
  authCardBorder: "rgba(255, 255, 255, 0.08)",
  authCardShadow: "#000000",
  authInputBg: "rgba(18, 24, 33, 0.88)",
  authInputBorder: "#36404F",
  authInputBorderActive: "#3B82F6",
  authInputPlaceholder: "#94A3B8",
  authInputText: "#F8FAFC",
  authCtaGradient: ["#3B82F6", "#2563EB"],
  authCtaSolid: "#009FFD",
  authCtaText: "#E7F5FF",
  authIconMuted: "#94A3B8",
  authForgotPassword: "#93C5FD",
  authFooter: "#94A3B8",
  authBottomNote: "#64748B",

  loadingGradient: ["#0F1115", "#131A24", "#1A1F27"],
  loadingBg: "#0F1115",
  loadingGlowBlue: "rgba(59, 130, 246, 0.16)",
  loadingGlowPurple: "rgba(168, 85, 247, 0.1)",
  loadingDot: "#3B82F6",

  feedbackError: "#F87171",
  feedbackSuccess: "#4ADE80",
  feedbackWarningBg: "rgba(245, 158, 11, 0.08)",
  feedbackWarningBorder: "rgba(245, 158, 11, 0.14)",
  feedbackWarningIconCircle: "rgba(250, 204, 21, 0.12)",
  feedbackWarningTitle: "#FCD34D",
  feedbackWarningBody: "#CBD5E1",
  feedbackWarningGlyph: "#FACC15",

  tripSelectorIdleText: "#FFFFFF",
  tripActionOutlineText: "#E2E8F0",

  scannerRootBg: "#060B18",
  scannerScreenContainerBg: "#060B18",
  scannerBadgeBg: "rgba(59, 130, 246, 0.1)",
  scannerBadgeText: "#60A5FA",
  scannerCameraBg: "#111827",
  scannerCameraBorder: "rgba(96, 165, 250, 0.18)",
  scannerCameraShadow: "#3B82F6",
  scannerOverlay: "rgba(6, 11, 24, 0.16)",
  scannerCorner: "#60A5FA",
  scannerScanLine: "#60A5FA",
  scannerHintText: "#F8FAFC",
  scannerHintPillBg: "rgba(15, 23, 42, 0.88)",
  scannerPanelBg: "#111827",
  scannerPanelBorder: "rgba(255, 255, 255, 0.04)",
  scannerMatchContainerBg: "rgba(255, 255, 255, 0.03)",
  scannerMatchItemBg: "rgba(255, 255, 255, 0.04)",
  scannerSelectionBg: "rgba(59, 130, 246, 0.1)",
  scannerSelectionLabel: "#DBEAFE",
  scannerSelectionMuted: "#94A3B8",

  modalSheetBg: "#111827",
  modalSheetBorder: "rgba(255, 255, 255, 0.07)",
  modalHandle: "rgba(255, 255, 255, 0.15)",
  modalTitle: "#F8FAFC",
  modalSubtitle: "#94A3B8",
  modalStudentBannerBg: "rgba(59, 130, 246, 0.1)",
  modalAvatarBg: "#2563EB",
  modalName: "#F8FAFC",
  modalStatus: "#93C5FD",

  attendancePending: "#B91C1C",
  attendanceOnboard: "#1D4ED8",
  attendanceCompleted: "#166534",
  attendanceLabel: "#FFFFFF",

  statusBadgeBg: "rgba(148, 163, 184, 0.12)",
  statusBadgeText: "#CBD5E1",
  statusBadgeActiveBg: "rgba(34, 197, 94, 0.16)",
  statusSuccessText: "#4ADE80",

  switchTrackOff: "#475569",
  switchTrackOn: "#2563EB",
  switchThumb: "#F8FAFC",

  appearanceControlBg: "rgba(255, 255, 255, 0.08)",
  appearanceControlBorder: "rgba(255, 255, 255, 0.12)",
  appearanceControlKnob: "rgba(30, 41, 59, 0.95)",
  appearanceControlKnobBorder: "rgba(255, 255, 255, 0.14)",
  appearanceControlIconActive: "#FBBF24",
  appearanceControlIconMuted: "rgba(148, 163, 184, 0.65)",
};

export function getSemanticColors(scheme: ColorSchemeId): SemanticColors {
  return scheme === "dark" ? darkSemanticColors : lightSemanticColors;
}
