import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Button, type ButtonProps } from 'react-native-paper';

import { useAppTheme } from '@/src/core/theme/ThemeProvider';

type AppButtonVariant = 'primary' | 'authPrimary';

type AppButtonProps = ButtonProps & {
  variant?: AppButtonVariant;
};

export function AppButton({ variant = 'primary', style, labelStyle, ...props }: AppButtonProps) {
  const { colors, tokens } = useAppTheme();
  const isAuthPrimary = variant === 'authPrimary';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          borderRadius: tokens.radius.md,
        },
        authPrimary: {
          backgroundColor: colors.authCtaSolid,
        },
        authPrimaryLabel: {
          ...tokens.typography.bodyStrong,
          color: colors.authCtaText,
        },
      }),
    [colors, tokens],
  );

  return (
    <Button
      mode="contained"
      style={[styles.base, isAuthPrimary ? styles.authPrimary : undefined, style]}
      labelStyle={[isAuthPrimary ? styles.authPrimaryLabel : undefined, labelStyle]}
      {...props}
    />
  );
}
