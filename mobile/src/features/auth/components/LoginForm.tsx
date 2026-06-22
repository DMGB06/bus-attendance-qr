import { useMemo, useRef, useState } from 'react';
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

import { useAppTheme } from '@/src/core/theme/ThemeProvider';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppInput } from '@/src/shared/ui/AppInput';
import { AppScrollView } from '@/src/shared/ui/AppScrollView';

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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: colors.screenSolid,
        },
        keyboardRoot: {
          flex: 1,
        },
        scrollInner: {
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: tokens.spacing.xl,
          paddingVertical: tokens.spacing['2xl'],
        },
        panel: {
          width: '100%',
          maxWidth: 420,
          alignSelf: 'center',
          gap: tokens.spacing.lg,
        },
        brandBlock: {
          alignItems: 'center',
          gap: tokens.spacing.sm,
        },
        logo: {
          width: 88,
          height: 88,
        },
        brandTitle: {
          ...tokens.typography.title1,
          color: colors.textTitle,
          textAlign: 'center',
        },
        brandSubtitle: {
          ...tokens.typography.body,
          color: colors.textMuted,
          textAlign: 'center',
        },
        accentLine: {
          height: 3,
          width: 56,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.accent,
          alignSelf: 'center',
        },
        formHeader: {
          alignItems: 'center',
          gap: tokens.spacing.xs,
        },
        formTitle: {
          ...tokens.typography.title3,
          color: colors.textTitle,
          textAlign: 'center',
        },
        formHint: {
          ...tokens.typography.body,
          color: colors.textMuted,
          textAlign: 'center',
        },
        fields: {
          gap: tokens.spacing.md,
        },
        forgotPassword: {
          ...tokens.typography.label,
          color: colors.authForgotPassword,
          textAlign: 'right',
        },
        buttonContent: {
          height: tokens.layout.buttonHeight - 4,
        },
      }),
    [colors, tokens],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardRoot}
      >
        <AppScrollView
          omitTabBarInset
          extraBottomInset={0}
          contentContainerStyle={styles.scrollInner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.panel}>
            <View style={styles.brandBlock}>
              <Image
                source={require('../../../../assets/images/escudo_MDCA.png')}
                style={styles.logo}
                resizeMode="contain"
                accessibilityLabel="Escudo Municipalidad de Cerro Azul"
              />
              <Text style={styles.brandTitle}>Bus Escolar</Text>
              <Text style={styles.brandSubtitle}>Municipalidad de Cerro Azul</Text>
            </View>

            <View style={styles.accentLine} />

            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Ingreso de operador</Text>
              <Text style={styles.formHint}>Control de asistencia en ruta escolar</Text>
            </View>

            <View style={styles.fields}>
              <AppInput
                variant="auth"
                placeholder="Usuario"
                value={email}
                onChangeText={onChangeEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
                disabled={isSubmitting || isResettingPassword}
                left={<AppInput.Icon icon="account-outline" color={colors.authIconMuted} />}
              />

              <AppInput
                ref={passwordInputRef}
                variant="auth"
                placeholder="Contraseña"
                value={password}
                onChangeText={onChangePassword}
                secureTextEntry={!isPasswordVisible}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={onSubmit}
                disabled={isSubmitting || isResettingPassword}
                left={<AppInput.Icon icon="lock-outline" color={colors.authIconMuted} />}
                right={
                  <AppInput.Icon
                    icon={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                    color={colors.authIconMuted}
                    forceTextInputFocus={false}
                    onPress={() => setIsPasswordVisible((visible) => !visible)}
                    accessibilityLabel={
                      isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                  />
                }
              />
            </View>

            {!hasSupabaseConfig ? (
              <HelperText type="error" visible>
                Configura Supabase correctamente.
              </HelperText>
            ) : null}

            {errorMessage ? (
              <HelperText type="error" visible>
                {errorMessage}
              </HelperText>
            ) : null}

            <Pressable onPress={onForgotPassword} disabled={isSubmitting || isResettingPassword}>
              <Text style={styles.forgotPassword}>
                {isResettingPassword ? 'Enviando enlace...' : '¿Olvidaste tu contraseña?'}
              </Text>
            </Pressable>

            <AppButton
              variant="authPrimary"
              onPress={onSubmit}
              loading={isSubmitting}
              disabled={isSubmitting || isResettingPassword}
              contentStyle={styles.buttonContent}
            >
              Ingresar
            </AppButton>
          </View>
        </AppScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
