import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { HelperText, Text } from 'react-native-paper';
import { login } from '@/src/services/auth';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppInput } from '@/src/components/ui/AppInput';
import { useTheme } from 'react-native-paper';
import { hasSupabaseConfig } from '@/src/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';

function getFriendlyLoginError(error: unknown) {
  if (!(error instanceof Error)) {
    return 'No se pudo iniciar sesión. Intenta nuevamente.';
  }

  const normalizedMessage = error.message.toLowerCase();

  if (normalizedMessage.includes('invalid login credentials')) {
    return 'Credenciales incorrectas. Verifica tu correo y contraseña.';
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'Tu correo aún no está confirmado.';
  }

  return 'No se pudo iniciar sesión. Intenta nuevamente.';
}

export default function LoginScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Ingresa correo y contraseña.');
      return;
    }

    if (!hasSupabaseConfig) {
      setErrorMessage('Falta configurar la conexión con Supabase.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await login(email.trim(), password);
    } catch (error: unknown) {
      setErrorMessage(getFriendlyLoginError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.container}>

        {/* Badge servidor conectado */}
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>Servidor Conectado</Text>
        </View>

        {/* Caja principal */}
        <View style={[styles.box, { backgroundColor: '#2d3449' }]}>

          {/* Ícono bus */}
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons name="bus" size={34} color="#fff" />
          </View>

          {/* Títulos */}
          <Text style={styles.municipality}>Municipalidad de Cerro Azul</Text>
          <View style={styles.divider} />
          <Text style={styles.title}>Acceso Chofer</Text>
          <Text style={styles.subtitle}>Ingrese sus credenciales de servicio</Text>

          {/* Campos */}
          <View style={styles.fields}>
            <Text style={styles.label}>Email Institucional</Text>
            <AppInput
              label=""
              placeholder="nombre@cerroazul.gov"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setErrorMessage(null);
              }}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              disabled={isSubmitting}
              left={<AppInput.Icon icon="email-outline" />}
            />

            <Text style={styles.label}>Contraseña</Text>
            <AppInput
              label=""
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrorMessage(null);
              }}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              disabled={isSubmitting}
              left={<AppInput.Icon icon="lock-outline" />}
            />
          </View>

          {/* Recordarme / Olvidé */}
          <View style={styles.row}>
            <Text style={styles.mutedText}>Recordarme</Text>
            <Text style={[styles.mutedText, { color: '#4A90E2' }]}>¿Olvidó su clave?</Text>
          </View>

          {/* Errores */}
          {!hasSupabaseConfig ? (
            <HelperText type="error" visible>
              Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en .env y reinicia Expo.
            </HelperText>
          ) : null}

          {errorMessage ? (
            <HelperText type="error" visible>
              {errorMessage}
            </HelperText>
          ) : null}

          {/* Botón */}
          <AppButton
            onPress={handleLogin}
            loading={isSubmitting}
            disabled={isSubmitting}
            icon="login"
          >
            Ingresar
          </AppButton>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Sistema de Gestión de Transporte Público © 2024</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    marginBottom: 4,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  badgeText: {
    color: '#4ade80',
    fontSize: 12,
  },
  box: {
    borderRadius: 20,
    padding: 24,
    gap: 12,
  },
  iconWrapper: {
    backgroundColor: '#3d4a6b',
    padding: 14,
    borderRadius: 16,
    alignSelf: 'center',
  },
  municipality: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#3d4a6b',
    marginVertical: 2,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 13,
  },
  fields: {
    gap: 4,
  },
  label: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mutedText: {
    color: '#9ca3af',
    fontSize: 13,
  },
  footer: {
    color: '#6b7280',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
  },
});
