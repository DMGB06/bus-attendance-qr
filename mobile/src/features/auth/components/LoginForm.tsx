import { useRef } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput as NativeTextInput,
  View,
} from 'react-native';
import { HelperText, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppInput } from '@/src/shared/ui/AppInput';
import { colors, fontSize, spacing, fontFamily } from '@/src/core/theme/theme';
import { useWindowDimensions } from 'react-native';

type LoginFormProps = {
  email: string;
  password: string;
  errorMessage: string | null;
  isSubmitting: boolean;
  isResettingPassword: boolean;
  hasSupabaseConfig: boolean;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onSubmit: () => void;
  onForgotPassword: () => void;
};

export function LoginForm({
  email,
  password,
  errorMessage,
  isSubmitting,
  isResettingPassword,
  hasSupabaseConfig,
  onChangeEmail,
  onChangePassword,
  onSubmit,
  onForgotPassword,
}: LoginFormProps) {
  const passwordInputRef = useRef<NativeTextInput | null>(null);
  const windowDimensions = useWindowDimensions();
  const isMobile = windowDimensions.width < 768;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <View style={styles.glow} />

        <View style={[styles.container, isMobile && styles.containerMobile]}>
          <View style={styles.brandBlock} accessible accessibilityLabel="Escudo Municipalidad de Cerro Azul">
            <Image
              source={require('../../../../assets/images/escudo_MDCA.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            <View style={styles.brandTextBlock}>
              <Text style={styles.brandLine}>Municipalidad de</Text>
              <Text style={styles.brandName}>Cerro Azul</Text>
            </View>
          </View>

          <Text style={styles.title}>Portal de Acceso</Text>

          <View style={styles.fields}>
            <AppInput
              variant="auth"
              label=""
              placeholder="Usuario"
              value={email}
              onChangeText={onChangeEmail}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              blurOnSubmit={false}
              disabled={isSubmitting || isResettingPassword}
              left={<AppInput.Icon icon="account-outline" color={colors.authInputPlaceholder} />}
              accessibilityLabel="Campo de usuario o correo"
            />

            <AppInput
              ref={passwordInputRef}
              variant="auth"
              label=""
              placeholder="Contraseña"
              value={password}
              onChangeText={onChangePassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
              disabled={isSubmitting || isResettingPassword}
              left={<AppInput.Icon icon="lock-outline" color={colors.authInputPlaceholder} />}
              accessibilityLabel="Campo de contraseña"
            />
          </View>

          {!hasSupabaseConfig ? (
            <HelperText type="error" visible style={styles.errorText}>
              Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en .env y reinicia Expo.
            </HelperText>
          ) : null}

          {errorMessage ? (
            <HelperText type="error" visible style={styles.errorText}>
              {errorMessage}
            </HelperText>
          ) : null}

          <AppButton
            variant="authPrimary"
            onPress={onSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || isResettingPassword}
            style={styles.button}
            contentStyle={styles.buttonContent}
            accessibilityLabel="Ingresar al portal"
          >
            Ingresar
          </AppButton>

          <Pressable
            onPress={onForgotPassword}
            disabled={isSubmitting || isResettingPassword}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Recuperar contraseña"
          >
            <Text style={styles.forgotPassword}>
              {isResettingPassword ? 'Enviando enlace...' : 'Olvidé mi contraseña'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>Acceso seguro para conductores - Municipalidad de Cerro Azul</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    minHeight: '100%',
    backgroundColor: colors.background,
  },
  root: {
    flex: 1,
    minHeight: '100%',
    backgroundColor: colors.background,
  },
  glow: {
    position: 'absolute',
    top: 120,
    left: -150,
    right: -150,
    height: 320,
    borderRadius: 160,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: 22,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  containerMobile: {
    paddingTop: 100,
  },
  brandTextBlock: {
    alignItems: 'flex-start',
  },
  logo: {
    width: 108,
    height: 108,
  },
  brandLine: {
    color: colors.authTextSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    lineHeight: fontSize.sm + 1,
  },
  brandName: {
    color: colors.textPrimary,
    fontSize: 38,
    fontFamily: fontFamily.bold,
    lineHeight: 33,
    marginTop: -1,
  },
  title: {
    color: colors.authTextPrimary,
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    textAlign: 'center',
    marginBottom: 10,
  },
  fields: {
    width: '100%',
    maxWidth: 360,
    gap: 14,
  },
  errorText: {
    width: '100%',
    marginTop: -4,
  },
  button: {
    width: '100%',
    maxWidth: 360,
  },
  buttonContent: {
    height: 56,
  },
  forgotPassword: {
    color: colors.authTextSecondary,
    fontSize: 16,
    fontFamily: fontFamily.regular,
    marginTop: 4,
    textAlign: 'center',
  },
  footer: {
    color: colors.authTextMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: 10,
  },
});
