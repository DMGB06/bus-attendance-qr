import { Button, type ButtonProps } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { colors, radius } from '@/src/core/theme/theme';

type AppButtonVariant = 'primary' | 'authPrimary';

type AppButtonProps = ButtonProps & {
  variant?: AppButtonVariant;
};

export function AppButton({ variant = 'primary', style, labelStyle, ...props }: AppButtonProps) {
  const isAuthPrimary = variant === 'authPrimary';

  return (
    <Button
      mode="contained"
      style={[styles.base, isAuthPrimary ? styles.authPrimary : undefined, style]}
      labelStyle={[isAuthPrimary ? styles.authPrimaryLabel : undefined, labelStyle]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: 6,
  },
  authPrimary: {
    borderRadius: 28,
    backgroundColor: colors.authCta,
    shadowColor: colors.authCta,
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
});
