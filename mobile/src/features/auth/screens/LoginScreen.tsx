import { useCallback, useState } from 'react';
import { login, requestPasswordReset } from '@/src/features/auth/services/auth.service';
import { hasSupabaseConfig } from '@/src/core/config/supabase';
import { LoginForm } from '@/src/features/auth/components/LoginForm';
import { getErrorMessage } from '@/src/shared/utils/errors';

import PwaInstallBanner from '../../../../components/PwaInstallBanner';

// DEFINIMOS EL DOMINIO POR DEFECTO PARA AUTOCOMPLETAR
const DEFAULT_DOMAIN = '@mdca.test'; // Cambia esto al dominio que uses en Supabase

function getFriendlyLoginError(error: unknown) {
  const normalizedMessage = getErrorMessage(error, '').toLowerCase();

  if (!normalizedMessage) {
    return 'No se pudo iniciar sesión. Intenta nuevamente.';
  }

  if (normalizedMessage.includes('invalid login credentials')) {
    return 'Credenciales incorrectas. Verifica tu usuario y contraseña.';
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'Tu usuario aún no está confirmado.';
  }

  return 'No se pudo iniciar sesión. Intenta nuevamente.';
}

function getFriendlyResetError(error: unknown) {
  const normalizedMessage = getErrorMessage(error, '').toLowerCase();

  if (!normalizedMessage) {
    return 'No se pudo enviar el enlace de recuperación.';
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'Tu usuario aún no está confirmado.';
  }

  return 'No se pudo enviar el enlace de recuperación.';
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleLogin = useCallback(async () => {
    const rawInput = email.trim();
    if (!rawInput || !password.trim()) {
      setErrorMessage('Ingresa usuario y contraseña.');
      return;
    }

    if (!hasSupabaseConfig) {
      setErrorMessage('Falta configurar la conexión con Supabase.');
      return;
    }

    // Si el usuario no ingresó un '@', le concatenamos el dominio automáticamente
    const finalEmail = rawInput.includes('@') ? rawInput : `${rawInput}${DEFAULT_DOMAIN}`;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await login(finalEmail, password); // Enviamos el correo autocompletado a Supabase
    } catch (error: unknown) {
      setErrorMessage(getFriendlyLoginError(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password]);

  const handleForgotPassword = useCallback(async () => {
    const rawInput = email.trim();

    if (!rawInput) {
      setErrorMessage('Ingresa tu usuario para recuperar tu contraseña.');
      return;
    }

    if (!hasSupabaseConfig) {
      setErrorMessage('Falta configurar la conexión con Supabase.');
      return;
    }

    // También autocompletamos el dominio para la recuperación de contraseña
    const finalEmail = rawInput.includes('@') ? rawInput : `${rawInput}${DEFAULT_DOMAIN}`;

    setIsResettingPassword(true);
    setErrorMessage(null);
    try {
      await requestPasswordReset(finalEmail);
      setErrorMessage('Revisa tu correo para restablecer la contraseña.');
    } catch (error: unknown) {
      setErrorMessage(getFriendlyResetError(error));
    } finally {
      setIsResettingPassword(false);
    }
  }, [email]);

  const handleChangeEmail = useCallback((text: string) => {
    setEmail(text);
    setErrorMessage(null);
  }, []);

  const handleChangePassword = useCallback((text: string) => {
    setPassword(text);
    setErrorMessage(null);
  }, []);

  const handleSubmit = useCallback(() => {
    void handleLogin();
  }, [handleLogin]);

  const handleForgotPasswordPress = useCallback(() => {
    void handleForgotPassword();
  }, [handleForgotPassword]);

  return (
    <>
      <PwaInstallBanner />
      <LoginForm
        email={email}
        password={password}
        errorMessage={errorMessage}
        isSubmitting={isSubmitting}
        isResettingPassword={isResettingPassword}
        hasSupabaseConfig={hasSupabaseConfig}
        onChangeEmail={handleChangeEmail}
        onChangePassword={handleChangePassword}
        onSubmit={handleSubmit}
        onForgotPassword={handleForgotPasswordPress}
      />
    </>
  );
}