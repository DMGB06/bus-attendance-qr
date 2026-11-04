import { getSemanticColors, type SemanticColors } from "@/src/core/theme/semanticColors";

function luminance(color: string): number {
  const hex = color.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

const TEXT_ON_SURFACES: [keyof SemanticColors, keyof SemanticColors][] = [
  ["textTitle", "surfaceCard"],
  ["textBody", "surfaceCard"],
  ["textSubtitle", "surfaceCard"],
  ["textMuted", "surfaceCard"],
  ["textBody", "screenSolid"],
  ["textSubtitle", "screenSolid"],
  ["textMuted", "screenSolid"],
  ["textLink", "surfaceCard"],
  ["feedbackError", "surfaceCard"],
  ["feedbackError", "screenSolid"],
  ["feedbackSuccess", "surfaceCard"],
  ["tabBarActive", "tabBarBg"],
  ["tabBarInactive", "tabBarBg"],
  ["navHeaderTitle", "navHeaderBg"],
  ["navHeaderSubtitle", "navHeaderBg"],
  ["textOnPrimary", "primary"],
  ["primarySoftText", "primarySoftBg"],
  ["feedbackWarningTitle", "feedbackWarningBg"],
  ["feedbackWarningBody", "feedbackWarningBg"],
];

describe.each(["light", "dark"] as const)("contraste de texto en tema %s", (scheme) => {
  const colors = getSemanticColors(scheme);
  const solidPairs = TEXT_ON_SURFACES.filter(([text, surface]) =>
    [colors[text], colors[surface]].every((value) => /^#[0-9a-f]{6}$/i.test(String(value))),
  );

  it.each(solidPairs)("%s sobre %s llega a 4.5:1", (text, surface) => {
    expect(contrast(String(colors[text]), String(colors[surface]))).toBeGreaterThanOrEqual(4.5);
  });
});
