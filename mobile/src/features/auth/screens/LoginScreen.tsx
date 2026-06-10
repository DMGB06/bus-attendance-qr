import { useCallback, useState } from 'react';
import { login, requestPasswordReset } from '@/src/features/auth/services/auth.service';
import { hasSupabaseConfig } from '@/src/core/config/supabase';
import { LoginForm } from '@/src/features/auth/components/LoginForm';
import { getErrorMessage } from '@/src/shared/utils/errors';

function getFriendlyLoginError(error: unknown) {
  const normalizedMessage = getErrorMessage(error, '').toLowerCase();

  if (!normalizedMessage) {
    return 'No se pudo iniciar sesión. Intenta nuevamente.';
  }

  if (normalizedMessage.includes('invalid login credentials')) {
    return 'Credenciales incorrectas. Verifica tu correo y contraseña.';
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'Tu correo aún no está confirmado.';
  }

  return 'No se pudo iniciar sesión. Intenta nuevamente.';
}

function getFriendlyResetError(error: unknown) {
  const normalizedMessage = getErrorMessage(error, '').toLowerCase();

  if (!normalizedMessage) {
    return 'No se pudo enviar el enlace de recuperación.';
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'Tu correo aún no está confirmado.';
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
  }, [email, password]);

  const handleForgotPassword = useCallback(async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setErrorMessage('Ingresa tu correo para recuperar tu contraseña.');
      return;
    }

    if (!hasSupabaseConfig) {
      setErrorMessage('Falta configurar la conexión con Supabase.');
      return;
    }

    setIsResettingPassword(true);
    setErrorMessage(null);
    try {
      await requestPasswordReset(normalizedEmail);
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
  );
}
