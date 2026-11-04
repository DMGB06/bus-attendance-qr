/**
 * Semantic color tokens: every UI color resolves here per scheme.
 * Add new themes by extending ColorSchemeId and implementing a new palette object.
 */
export type ColorSchemeId = "light" | "dark";

export type SemanticColors = {
  screenSolid: string;

  textTitle: string;
  textSubtitle: string;
  textBody: string;
  textMuted: string;
  textInverse: string;
  textLink: string;
  textOnPrimary: string;

  borderDefault: string;
  borderMuted: string;

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

  sky: string;
  skySoftBg: string;

  /** Cabecera con olas */
  headerBg: string;
  onHeader: string;
  onHeaderMuted: string;
  headerStatBg: string;
  waveBack: string;
  waveMid: string;

  /** Ingreso: cielo, olas y mar */
  authSky: string;
  authSkyTitle: string;
  authSkyText: string;
  authSea: string;
  authWaveBack: string;
  authWaveMid: string;

  /** Etiquetas de estado: texto sobre su fondo */
  statusPendingText: string;
  statusPendingBg: string;
  statusOnboardText: string;
  statusOnboardBg: string;
  statusCompletedText: string;
  statusCompletedBg: string;
  destructive: string;


  tabBarBg: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;


  authInputBg: string;
  authInputBorder: string;
  authInputBorderActive: string;
  authInputPlaceholder: string;
  authInputText: string;
  authCtaSolid: string;
  authCtaText: string;
  authIconMuted: string;
  authForgotPassword: string;


  feedbackError: string;
  feedbackSuccess: string;
  feedbackWarningBg: string;
  feedbackWarningBorder: string;
  feedbackWarningTitle: string;
  feedbackWarningBody: string;
  feedbackWarningGlyph: string;

  tripSelectorIdleText: string;
  tripActionOutlineText: string;

  scannerCameraBg: string;
  scannerOverlay: string;
  scannerCorner: string;
  scannerPanelBg: string;
  scannerPanelBorder: string;

  modalSheetBg: string;
  modalSheetBorder: string;
  modalBackdrop: string;
  modalHandle: string;
  modalSubtitle: string;
  modalStudentBannerBg: string;
  modalAvatarBg: string;
  modalName: string;
  modalStatus: string;

  attendancePending: string;
  attendanceOnboard: string;
  attendanceCompleted: string;
  attendanceLabel: string;



  /** Control segmentado claro/oscuro (navbar y formularios) */
  appearanceControlIconActive: string;
};

export const lightSemanticColors: SemanticColors = {
  screenSolid: "#FFFFFF",

  textTitle: "#0D2C47",
  textSubtitle: "#4A6478",
  textBody: "#0D2C47",
  textMuted: "#4A6478",
  textInverse: "#FFFFFF",
  textLink: "#0A4F8A",
  textOnPrimary: "#FFFFFF",

  borderDefault: "#C4D4DF",
  borderMuted: "#E1EBF1",

  surfaceCard: "#FFFFFF",
  surfaceCardBorder: "#E1EBF1",
  surfaceTrack: "#F3F8FB",
  surfaceDivider: "#E1EBF1",
  surfaceListItem: "#FFFFFF",

  primary: "#12395F",
  primaryPressed: "#0C2A47",
  primarySoftBg: "#E1F0FB",
  primarySoftText: "#0B5FB0",
  primaryIconContrast: "#FFFFFF",

  sky: "#0B5FB0",
  skySoftBg: "#E1F0FB",
  headerBg: "#0A4F8A",
  onHeader: "#FFFFFF",
  onHeaderMuted: "#D6ECFB",
  headerStatBg: "rgba(255, 255, 255, 0.14)",
  waveBack: "#3F9EE0",
  waveMid: "#9AD4F5",

  authSky: "#E8F6FE",
  authSkyTitle: "#083E6E",
  authSkyText: "#2A5777",
  authSea: "#083E6E",
  authWaveBack: "#A9DCF6",
  authWaveMid: "#4CAEE6",

  statusPendingText: "#B4480F",
  statusPendingBg: "#FCEDE3",
  statusOnboardText: "#0B5FB0",
  statusOnboardBg: "#E1F0FB",
  statusCompletedText: "#157045",
  statusCompletedBg: "#E2F4EA",
  destructive: "#B3261E",


  tabBarBg: "#FFFFFF",
  tabBarBorder: "#E1EBF1",
  tabBarActive: "#0A4F8A",
  tabBarInactive: "#4A6478",


  authInputBg: "rgba(255, 255, 255, 0.13)",
  authInputBorder: "rgba(255, 255, 255, 0.42)",
  authInputBorderActive: "#FFFFFF",
  authInputPlaceholder: "rgba(255, 255, 255, 0.72)",
  authInputText: "#FFFFFF",
  authCtaSolid: "#FFFFFF",
  authCtaText: "#083E6E",
  authIconMuted: "#D6ECFB",
  authForgotPassword: "#D6ECFB",


  feedbackError: "#B3261E",
  feedbackSuccess: "#157045",
  feedbackWarningBg: "#FCEDE3",
  feedbackWarningBorder: "#F3CFB5",
  feedbackWarningTitle: "#B4480F",
  feedbackWarningBody: "#0D2C47",
  feedbackWarningGlyph: "#B4480F",

  tripSelectorIdleText: "#4A6478",
  tripActionOutlineText: "#12395F",

  scannerCameraBg: "#0C2A47",
  scannerOverlay: "rgba(12, 42, 71, 0.14)",
  scannerCorner: "#FFFFFF",
  scannerPanelBg: "#FFFFFF",
  scannerPanelBorder: "rgba(18, 57, 95, 0.1)",

  modalSheetBg: "#FFFFFF",
  modalSheetBorder: "rgba(18, 57, 95, 0.12)",
  modalBackdrop: "rgba(12, 42, 71, 0.45)",
  modalHandle: "#C4D4DF",
  modalSubtitle: "#4A6478",
  modalStudentBannerBg: "#12395F",
  modalAvatarBg: "#0C2A47",
  modalName: "#FFFFFF",
  modalStatus: "rgba(255, 255, 255, 0.82)",

  attendancePending: "#B4480F",
  attendanceOnboard: "#12395F",
  attendanceCompleted: "#157045",
  attendanceLabel: "#FFFFFF",



  appearanceControlIconActive: "#12395F",
};

export const darkSemanticColors: SemanticColors = {
  screenSolid: "#141820",

  textTitle: "#ECEFF4",
  textSubtitle: "#A8B0C2",
  textBody: "#A8B0C2",
  textMuted: "#8E98AD",
  textInverse: "#FFFFFF",
  textLink: "#6BBDE8",
  textOnPrimary: "#FFFFFF",

  borderDefault: "rgba(255, 255, 255, 0.09)",
  borderMuted: "rgba(255, 255, 255, 0.05)",

  surfaceCard: "#1C2130",
  surfaceCardBorder: "rgba(255, 255, 255, 0.07)",
  surfaceTrack: "#252B3A",
  surfaceDivider: "rgba(255, 255, 255, 0.05)",
  surfaceListItem: "#1C2130",

  primary: "#2F6CA3",
  primaryPressed: "#25588A",
  primarySoftBg: "#16324B",
  primarySoftText: "#9CCBF0",
  primaryIconContrast: "#FFFFFF",

  sky: "#6BBDE8",
  skySoftBg: "rgba(107, 189, 232, 0.12)",
  headerBg: "#0F3558",
  onHeader: "#FFFFFF",
  onHeaderMuted: "#D6ECFB",
  headerStatBg: "rgba(255, 255, 255, 0.12)",
  waveBack: "#1F6AA0",
  waveMid: "#2F86BF",

  authSky: "#E8F6FE",
  authSkyTitle: "#083E6E",
  authSkyText: "#2A5777",
  authSea: "#083E6E",
  authWaveBack: "#A9DCF6",
  authWaveMid: "#4CAEE6",

  statusPendingText: "#F3B48C",
  statusPendingBg: "#3A2416",
  statusOnboardText: "#9CCBF0",
  statusOnboardBg: "#16324B",
  statusCompletedText: "#8ADBB0",
  statusCompletedBg: "#123524",
  destructive: "#F08080",


  tabBarBg: "#1C2130",
  tabBarBorder: "rgba(255, 255, 255, 0.07)",
  tabBarActive: "#ECEFF4",
  tabBarInactive: "#8E98AD",


  authInputBg: "rgba(255, 255, 255, 0.13)",
  authInputBorder: "rgba(255, 255, 255, 0.42)",
  authInputBorderActive: "#FFFFFF",
  authInputPlaceholder: "rgba(255, 255, 255, 0.72)",
  authInputText: "#FFFFFF",
  authCtaSolid: "#FFFFFF",
  authCtaText: "#083E6E",
  authIconMuted: "#D6ECFB",
  authForgotPassword: "#D6ECFB",


  feedbackError: "#F08080",
  feedbackSuccess: "#5CB88A",
  feedbackWarningBg: "#3A2416",
  feedbackWarningBorder: "#5A3A24",
  feedbackWarningTitle: "#F3B48C",
  feedbackWarningBody: "#ECEFF4",
  feedbackWarningGlyph: "#F3B48C",

  tripSelectorIdleText: "#A8B0C2",
  tripActionOutlineText: "#8EB4E8",

  scannerCameraBg: "#0E1118",
  scannerOverlay: "rgba(0, 0, 0, 0.28)",
  scannerCorner: "#FFFFFF",
  scannerPanelBg: "#1C2130",
  scannerPanelBorder: "rgba(255, 255, 255, 0.07)",

  modalSheetBg: "#1C2130",
  modalSheetBorder: "rgba(255, 255, 255, 0.08)",
  modalBackdrop: "rgba(0, 0, 0, 0.55)",
  modalHandle: "#353D50",
  modalSubtitle: "#7A8499",
  modalStudentBannerBg: "#25588A",
  modalAvatarBg: "#2F6CA3",
  modalName: "#FFFFFF",
  modalStatus: "rgba(255, 255, 255, 0.75)",

  attendancePending: "#B4561F",
  attendanceOnboard: "#2F6CA3",
  attendanceCompleted: "#1A7F4F",
  attendanceLabel: "#FFFFFF",



  appearanceControlIconActive: "#ECEFF4",
};

/** Legibilidad en sol directo (parabrisas). Solo aplica sobre tema claro. */
export const highContrastSemanticColors: SemanticColors = {
  ...lightSemanticColors,
  screenSolid: "#FFFFFF",

  textTitle: "#000000",
  textSubtitle: "#1A1A1A",
  textBody: "#1A1A1A",
  textMuted: "#333333",

  borderDefault: "rgba(0, 0, 0, 0.35)",
  borderMuted: "rgba(0, 0, 0, 0.22)",

  surfaceTrack: "#D8DEE8",
  surfaceCard: "#FFFFFF",
  surfaceCardBorder: "rgba(0, 0, 0, 0.28)",
  surfaceDivider: "rgba(0, 0, 0, 0.18)",
  surfaceListItem: "#FFFFFF",

  primarySoftBg: "#CFE3F3",
  primarySoftText: "#12395F",

  tabBarInactive: "#444444",
  tabBarBorder: "rgba(0, 0, 0, 0.25)",


  tripSelectorIdleText: "#333333",
  tripActionOutlineText: "#12395F",

  scannerOverlay: "rgba(0, 0, 0, 0.28)",

  feedbackWarningBg: "#FCEDE3",
  feedbackWarningBorder: "rgba(0, 0, 0, 0.35)",
  feedbackWarningTitle: "#000000",
  feedbackWarningBody: "#1A1A1A",
  feedbackWarningGlyph: "#8F390C",

  modalSubtitle: "#333333",
  modalBackdrop: "rgba(0, 0, 0, 0.5)",

  sky: "#12395F",

  statusPendingText: "#8F390C",
  statusOnboardText: "#0B4F93",
  statusCompletedText: "#0F5A37",
  destructive: "#8C1D18",


  attendancePending: "#8F390C",
  attendanceOnboard: "#12395F",
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
