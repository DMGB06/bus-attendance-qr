import { useMemo, useRef } from 'react';
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
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: colors.screenSolid,
        },
        brandBand: {
          alignItems: 'center',
          backgroundColor: colors.primary,
          paddingTop: tokens.spacing['2xl'],
          paddingBottom: tokens.spacing.xl,
          paddingHorizontal: tokens.spacing.xl,
        },
        goldRule: {
          height: 4,
          backgroundColor: colors.accent,
        },
        formArea: {
          flex: 1,
          backgroundColor: colors.screenSolid,
          borderTopLeftRadius: tokens.radius['2xl'],
          borderTopRightRadius: tokens.radius['2xl'],
          marginTop: tokens.spacing.md,
          overflow: 'hidden',
        },
        scrollInner: {
          flexGrow: 1,
          paddingVertical: tokens.spacing.xl,
          paddingHorizontal: tokens.spacing.xl,
          gap: tokens.spacing.lg,
        },
        logo: {
          width: 96,
          height: 96,
          marginBottom: tokens.spacing.md,
        },
        brandTitle: {
          ...tokens.typography.title1,
          color: colors.textInverse,
          textAlign: 'center',
        },
        brandSubtitle: {
          ...tokens.typography.caption,
          color: colors.navHeaderSubtitle,
          textAlign: 'center',
          marginTop: tokens.spacing.xs,
        },
        formTitle: {
          ...tokens.typography.title3,
          color: colors.textTitle,
        },
        formHint: {
          ...tokens.typography.caption,
          color: colors.textMuted,
          marginTop: -tokens.spacing.sm,
        },
        fields: {
          gap: tokens.spacing.md,
        },
        errorText: {
          marginTop: -tokens.spacing.sm,
        },
        forgotPassword: {
          ...tokens.typography.bodyStrong,
          color: colors.authForgotPassword,
          textAlign: 'right',
        },
        buttonContent: {
          height: tokens.layout.buttonHeight - 4,
        },
        footer: {
          ...tokens.typography.caption,
          textAlign: 'center',
          color: colors.authFooter,
        },
      }),
    [colors, tokens],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.brandBand}>
        <Image
          source={require('../../../../assets/images/escudo_MDCA.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandTitle}>Bus Escolar</Text>
        <Text style={styles.brandSubtitle}>Municipalidad de Cerro Azul</Text>
      </View>

      <View style={styles.goldRule} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.formArea}
      >
        <AppScrollView
          omitTabBarInset
          extraBottomInset={0}
          contentContainerStyle={styles.scrollInner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View>
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
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={onSubmit}
              disabled={isSubmitting || isResettingPassword}
              left={<AppInput.Icon icon="lock-outline" color={colors.authIconMuted} />}
            />
          </View>

          {!hasSupabaseConfig ? (
            <HelperText type="error" visible style={styles.errorText}>
              Configura Supabase correctamente.
            </HelperText>
          ) : null}

          {errorMessage ? (
            <HelperText type="error" visible style={styles.errorText}>
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

          <Text style={styles.footer}>Acceso restringido a personal autorizado</Text>
        </AppScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
