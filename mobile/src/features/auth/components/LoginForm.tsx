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

import { LinearGradient } from 'expo-linear-gradient';

import { HelperText, Text } from 'react-native-paper';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/src/shared/ui/AppButton';
import { AppInput } from '@/src/shared/ui/AppInput';

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#0F1115', '#131A24', '#0F1722']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.glowBlue} />
      <View style={styles.glowPurple} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../../assets/images/escudo_MDCA.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.title}>Bienvenido de nuevo</Text>

            <Text style={styles.subtitle}>
              Accede al sistema de transporte escolar municipal.
            </Text>

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
                left={<AppInput.Icon icon="account-outline" color="#94A3B8" />}
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
                left={<AppInput.Icon icon="lock-outline" color="#94A3B8" />}
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

            <Pressable
              onPress={onForgotPassword}
              disabled={isSubmitting || isResettingPassword}
            >
              <Text style={styles.forgotPassword}>
                {isResettingPassword
                  ? 'Enviando enlace...'
                  : '¿Olvidaste tu contraseña?'}
              </Text>
            </Pressable>

            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <AppButton
                variant="authPrimary"
                onPress={onSubmit}
                loading={isSubmitting}
                disabled={isSubmitting || isResettingPassword}
                style={styles.button}
                contentStyle={styles.buttonContent}
              >
                Ingresar
              </AppButton>
            </LinearGradient>

            <Text style={styles.footer}>
              Acceso seguro • Municipalidad de Cerro Azul
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.bottomFooter,
            { paddingBottom: 20 + insets.bottom },
          ]}
        >
          <Text style={styles.bottomFooterText}>
            Transporte Escolar Inteligente
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F1115',
  },

  root: {
    flex: 1,
  },

  glowBlue: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(59,130,246,0.15)',
    top: -100,
    right: -100,
  },

  glowPurple: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(168,85,247,0.08)',
    bottom: 120,
    left: -80,
  },

  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  card: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: 'rgba(26,31,39,0.88)',
    borderRadius: 30,
    padding: 28,

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',

    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: {
      width: 0,
      height: 20,
    },

    elevation: 20,
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 18,
  },

  logo: {
    width: 78,
    height: 78,
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#F5F7FA',
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: '#A8B0BD',
    textAlign: 'center',
    marginBottom: 30,
  },

  fields: {
    gap: 16,
  },

  errorText: {
    marginTop: 8,
  },

  forgotPassword: {
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 14,
    marginBottom: 24,
    fontSize: 14,
  },

  buttonGradient: {
    borderRadius: 18,
    overflow: 'hidden',
  },

  button: {
    backgroundColor: 'transparent',
  },

  buttonContent: {
    height: 58,
  },

  footer: {
    marginTop: 28,
    textAlign: 'center',
    color: '#64748B',
    fontSize: 13,
  },

  bottomFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  bottomFooterText: {
    color: '#475569',
    fontSize: 12,
  },
});