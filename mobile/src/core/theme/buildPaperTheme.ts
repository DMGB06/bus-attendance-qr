import { configureFonts, MD3DarkTheme, MD3LightTheme, type MD3Theme } from "react-native-paper";

import type { SemanticColors } from "@/src/core/theme/semanticColors";
import { fontFamily } from "@/src/core/theme/tokens";

function interTypescale(base: typeof MD3LightTheme.fonts) {
  return configureFonts({
    isV3: true,
    config: {
      ...Object.fromEntries(
        (Object.keys(base) as (keyof typeof base)[]).map((key) => {
          const entry = base[key];
          const isDisplay = String(key).startsWith("display");
          const isHeadline = String(key).startsWith("headline");
          const isTitle = String(key).startsWith("title");
          const isLabel = String(key).startsWith("label");
          const family =
            isDisplay || isHeadline || isTitle
              ? fontFamily.bold
              : isLabel
                ? fontFamily.semiBold
                : fontFamily.regular;
          return [key, { ...entry, fontFamily: family }];
        }),
      ),
    },
  });
}

export function buildPaperTheme(colors: SemanticColors, isDark: boolean): MD3Theme {
  const base = isDark ? MD3DarkTheme : MD3LightTheme;

  return {
    ...base,
    fonts: interTypescale(base.fonts),
    colors: {
      ...base.colors,
      primary: colors.primary,
      onPrimary: colors.textOnPrimary,
      primaryContainer: colors.primarySoftBg,
      onPrimaryContainer: colors.primarySoftText,
      secondary: colors.primaryPressed,
      onSecondary: colors.textOnPrimary,
      background: colors.screenSolid,
      surface: colors.surfaceCard,
      surfaceVariant: colors.surfaceTrack,
      onSurface: colors.textBody,
      onSurfaceVariant: colors.textMuted,
      outline: colors.borderDefault,
      outlineVariant: colors.borderMuted,
      error: colors.feedbackError,
      onBackground: colors.textBody,
      elevation: base.colors.elevation,
    },
    roundness: 10,
  };
}
