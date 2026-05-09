import { StyleSheet } from 'react-native';
import { TextInput, type TextInputProps } from 'react-native-paper';
import { colors, radius } from '@/src/core/theme/theme';

type AppInputVariant = 'default' | 'auth';

type AppInputProps = TextInputProps & {
  variant?: AppInputVariant;
};

const BaseAppInput = ({ variant = 'default', style, theme, ...props }: AppInputProps) => {
  const isAuth = variant === 'auth';

  return (
    <TextInput
      mode="outlined"
      autoCapitalize="none"
      style={[isAuth ? styles.authInput : undefined, style]}
      outlineColor={isAuth ? colors.authInputBorder : props.outlineColor}
      activeOutlineColor={isAuth ? colors.authInputBorderActive : props.activeOutlineColor}
      textColor={isAuth ? colors.authTextPrimary : props.textColor}
      placeholderTextColor={isAuth ? colors.authInputPlaceholder : props.placeholderTextColor}
      theme={isAuth ? { ...theme, roundness: radius.lg } : theme}
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

const styles = StyleSheet.create({
  authInput: {
    backgroundColor: colors.authInputBackground,
    fontSize: 16,
  },
});
