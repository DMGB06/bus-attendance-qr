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
          paddingVertical: 6,
        },
        authPrimary: {
          borderRadius: 28,
          backgroundColor: colors.authCtaSolid,
          shadowColor: colors.authCtaSolid,
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 10,
        },
        authPrimaryLabel: {
          color: colors.authCtaText,
          fontSize: 16,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
      }),
    [colors, tokens.radius.md],
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
