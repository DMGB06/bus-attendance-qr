import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { TextInput, type TextInputProps } from 'react-native-paper';

import { useAppTheme } from '@/src/core/theme/ThemeProvider';

type AppInputVariant = 'default' | 'auth';

type AppInputProps = TextInputProps & {
  variant?: AppInputVariant;
};

const BaseAppInput = ({ variant = 'default', style, theme, ...props }: AppInputProps) => {
  const { colors, tokens } = useAppTheme();
  const isAuth = variant === 'auth';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        authInput: {
          backgroundColor: colors.authInputBg,
          fontSize: 16,
        },
      }),
    [colors.authInputBg],
  );

  return (
    <TextInput
      mode="outlined"
      autoCapitalize="none"
      style={[isAuth ? styles.authInput : undefined, style]}
      outlineColor={isAuth ? colors.authInputBorder : props.outlineColor}
      activeOutlineColor={isAuth ? colors.authInputBorderActive : props.activeOutlineColor}
      textColor={isAuth ? colors.authInputText : props.textColor}
      placeholderTextColor={isAuth ? colors.authInputPlaceholder : props.placeholderTextColor}
      theme={isAuth ? { ...theme, roundness: tokens.radius.lg } : theme}
      {...props}
    />
  );
};

type AppInputComponent = typeof BaseAppInput & {
  Icon: typeof TextInput.Icon;
};

export const AppInput = Object.assign(BaseAppInput, {
  Icon: TextInput.Icon,
}) as AppInputComponent;
