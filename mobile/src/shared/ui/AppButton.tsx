import { useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, type GestureResponderEvent } from 'react-native';
import { Button, type ButtonProps } from 'react-native-paper';

import { useAppTheme } from '@/src/core/theme/ThemeProvider';

type AppButtonVariant = 'primary' | 'secondary' | 'destructive' | 'authPrimary';

type AppButtonProps = ButtonProps & {
  variant?: AppButtonVariant;
};

const PRESS_EASING = Easing.bezier(0.23, 1, 0.32, 1);

export function AppButton({
  variant = 'primary',
  style,
  contentStyle,
  labelStyle,
  mode,
  onPressIn,
  onPressOut,
  ...props
}: AppButtonProps) {
  const { colors, tokens } = useAppTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: { borderRadius: tokens.radius.lg },
        content: { minHeight: tokens.layout.buttonHeight },
        label: { ...tokens.typography.headline, marginVertical: 0 },
        authPrimary: { backgroundColor: colors.authCtaSolid },
        authPrimaryLabel: { color: colors.authCtaText },
      }),
    [colors, tokens],
  );

  function pressTo(toValue: number) {
    Animated.timing(scale, {
      toValue,
      duration: 160,
      easing: PRESS_EASING,
      useNativeDriver: true,
    }).start();
  }

  const resolved: Partial<ButtonProps> =
    variant === 'secondary'
      ? { mode: mode ?? 'outlined', textColor: colors.tripActionOutlineText }
      : variant === 'destructive'
        ? { mode: mode ?? 'outlined', textColor: colors.destructive }
        : { mode: mode ?? 'contained' };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Button
        {...resolved}
        style={[styles.base, variant === 'authPrimary' ? styles.authPrimary : undefined, style]}
        contentStyle={[styles.content, contentStyle]}
        labelStyle={[styles.label, variant === 'authPrimary' ? styles.authPrimaryLabel : undefined, labelStyle]}
        onPressIn={(event: GestureResponderEvent) => {
          pressTo(0.97);
          onPressIn?.(event);
        }}
        onPressOut={(event: GestureResponderEvent) => {
          pressTo(1);
          onPressOut?.(event);
        }}
        {...props}
      />
    </Animated.View>
  );
}
