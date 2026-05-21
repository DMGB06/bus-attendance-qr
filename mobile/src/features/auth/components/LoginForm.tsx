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
import { LinearGradient } from 'expo-linear-gradient';
import { HelperText, Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/src/core/theme/ThemeProvider';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppInput } from '@/src/shared/ui/AppInput';
import { AppScrollView } from '@/src/shared/ui/AppScrollView';
import { ThemeAppearanceControl } from '@/src/shared/ui/ThemeAppearanceControl';

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
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: colors.screenSolid,
        },
        root: {
          flex: 1,
        },
        scrollInner: {
          flexGrow: 1,
          justifyContent: 'center',
          paddingVertical: tokens.spacing.xl,
          paddingHorizontal: tokens.spacing.xl,
        },
        card: {
          width: '100%',
          maxWidth: 400,
          alignSelf: 'center',
          backgroundColor: colors.authCardBg,
          borderRadius: tokens.radius['2xl'],
          padding: tokens.spacing.xl,
          borderWidth: 1,
          borderColor: colors.authCardBorder,
          shadowColor: colors.authCardShadow,
          shadowOpacity: 0.12,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 16 },
          elevation: 10,
        },
        logoContainer: {
          alignItems: 'center',
          marginBottom: tokens.spacing.lg,
        },
        logo: {
          width: 112,
          height: 112,
        },
        title: {
          ...tokens.typography.title1,
          color: colors.textTitle,
          textAlign: 'center',
        },
        subtitle: {
          ...tokens.typography.body,
          color: colors.textSubtitle,
          textAlign: 'center',
          marginTop: tokens.spacing.sm,
          marginBottom: tokens.spacing.xl,
        },
        fields: {
          gap: tokens.spacing.md,
        },
        errorText: {
          marginTop: tokens.spacing.sm,
        },
        forgotPassword: {
          ...tokens.typography.bodyStrong,
          color: colors.authForgotPassword,
          textAlign: 'right',
          marginTop: tokens.spacing.md,
          marginBottom: tokens.spacing.md,
        },
        buttonGradient: {
          borderRadius: tokens.radius.lg,
          overflow: 'hidden',
        },
        buttonContent: {
          height: 48,
        },
        footer: {
          ...tokens.typography.caption,
          marginTop: tokens.spacing.xl,
          textAlign: 'center',
          color: colors.authFooter,
        },
        themeSection: {
          marginTop: tokens.spacing.sm,
          paddingTop: tokens.spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.borderMuted,
        },
        bottomFooter: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          alignItems: 'center',
          paddingTop: tokens.spacing.sm,
        },
        bottomFooterText: {
          ...tokens.typography.caption,
          color: colors.authBottomNote,
        },
      }),
    [colors, tokens],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={colors.authScreenGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <AppScrollView
          omitTabBarInset
          extraBottomInset={0}
          contentContainerStyle={styles.scrollInner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.logoContainer}>
              <Image source={require('../../../../assets/images/escudo_MDCA.png')} style={styles.logo} resizeMode="contain" />
            </View>

            <Text style={styles.title}>Bienvenido de nuevo</Text>

            <Text style={styles.subtitle}>Accede al sistema de transporte escolar municipal.</Text>

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

            <LinearGradient colors={colors.authCtaGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.buttonGradient}>
              <AppButton
                variant="authPrimary"
                onPress={onSubmit}
                loading={isSubmitting}
                disabled={isSubmitting || isResettingPassword}
                contentStyle={styles.buttonContent}
              >
                Ingresar
              </AppButton>
            </LinearGradient>

            <Text style={styles.footer}>Acceso seguro • Municipalidad de Cerro Azul</Text>
          </View>
        </AppScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
