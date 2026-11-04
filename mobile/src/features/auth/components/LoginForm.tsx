import { useMemo, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput as NativeTextInput,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/src/core/theme/ThemeProvider';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppInput } from '@/src/shared/ui/AppInput';
import { WaveBand } from '@/src/shared/ui/WaveBand';

type LoginFormProps = {
  email: string;
  password: string;
  errorMessage: string | null;
  isSubmitting: boolean;
  infoMessage: string | null;
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
  infoMessage,
  hasSupabaseConfig,
  onChangeEmail,
  onChangePassword,
  onSubmit,
  onForgotPassword,
}: LoginFormProps) {
  const passwordInputRef = useRef<NativeTextInput | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { colors, tokens } = useAppTheme();
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.authSea,
        },
        scrollInner: {
          flexGrow: 1,
        },
        sky: {
          flexGrow: 1,
          backgroundColor: colors.authSky,
          alignItems: 'center',
          justifyContent: 'center',
          gap: tokens.spacing.sm,
          paddingTop: insets.top + tokens.spacing.xl,
          paddingBottom: tokens.spacing.lg,
          paddingHorizontal: tokens.spacing.lg,
        },
        logo: {
          width: 148,
          height: 148,
        },
        brandTitle: {
          ...tokens.typography.title1,
          fontSize: 30,
          lineHeight: 34,
          color: colors.authSkyTitle,
          textAlign: 'center',
        },
        brandSubtitle: {
          ...tokens.typography.body,
          color: colors.authSkyText,
          textAlign: 'center',
        },
        waves: {
          backgroundColor: colors.authSky,
        },
        sea: {
          backgroundColor: colors.authSea,
          paddingTop: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.xl,
          paddingBottom: insets.bottom + tokens.spacing.xl,
        },
        form: {
          width: '100%',
          maxWidth: 420,
          alignSelf: 'center',
          gap: tokens.spacing.md,
        },
        field: {
          gap: tokens.spacing.xs,
        },
        label: {
          ...tokens.typography.bodyStrong,
          color: colors.authInputText,
        },
        message: {
          ...tokens.typography.body,
          color: colors.feedbackWarningBody,
          backgroundColor: colors.feedbackWarningBg,
          borderRadius: tokens.radius.md,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
          overflow: 'hidden',
        },
        info: {
          ...tokens.typography.body,
          color: colors.authInputText,
        },
        forgotButton: {
          alignSelf: 'flex-end',
          minHeight: tokens.layout.minTouchTarget,
          justifyContent: 'center',
        },
        forgotPassword: {
          ...tokens.typography.label,
          color: colors.authForgotPassword,
        },
      }),
    [colors, insets.bottom, insets.top, tokens],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={styles.scrollInner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sky}>
          <Image
            source={require('../../../../assets/images/escudo_MDCA.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Escudo Municipalidad de Cerro Azul"
          />
          <Text style={styles.brandTitle} accessibilityRole="header">
            CerroBus
          </Text>
          <Text style={styles.brandSubtitle}>Municipalidad de Cerro Azul</Text>
        </View>

        <View style={styles.waves}>
          <WaveBand
            animated
            height={44}
            colors={[colors.authWaveBack, colors.authWaveMid, colors.authSea]}
          />
        </View>

        <View style={styles.sea}>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Usuario</Text>
              <AppInput
                variant="auth"
                value={email}
                onChangeText={onChangeEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                accessibilityLabel="Usuario"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
                disabled={isSubmitting}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Contraseña</Text>
              <AppInput
                ref={passwordInputRef}
                variant="auth"
                accessibilityLabel="Contraseña"
                value={password}
                onChangeText={onChangePassword}
                secureTextEntry={!isPasswordVisible}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={onSubmit}
                disabled={isSubmitting}
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
              <Text style={styles.message} accessibilityRole="alert">
                Configura Supabase correctamente.
              </Text>
            ) : null}

            {errorMessage ? (
              <Text style={styles.message} accessibilityRole="alert">
                {errorMessage}
              </Text>
            ) : null}

            {infoMessage ? <Text style={styles.info}>{infoMessage}</Text> : null}

            <AppButton
              variant="authPrimary"
              onPress={onSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Ingresar
            </AppButton>

            <Pressable
              onPress={onForgotPassword}
              disabled={isSubmitting}
              accessibilityRole="button"
              style={styles.forgotButton}
            >
              <Text style={styles.forgotPassword}>¿Olvidaste tu contraseña?</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
