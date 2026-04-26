import { colors } from "@/src/theme/theme";
import { useColorScheme } from "@/src/hooks/use-color-scheme";

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof colors,
) {
  const scheme = useColorScheme() ?? "dark";
  const colorFromProps = props[scheme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return colors[colorName];
  }
}
