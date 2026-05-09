import { useState } from 'react';
import { login, requestPasswordReset } from '@/src/features/auth/services/auth.service';
import { hasSupabaseConfig } from '@/src/core/config/supabase';
import { LoginForm } from '@/src/features/auth/components/LoginForm';

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

function getFriendlyResetError(error: unknown) {
  if (!(error instanceof Error)) {
    return 'No se pudo enviar el enlace de recuperación.';
  }

  const normalizedMessage = error.message.toLowerCase();

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

  async function handleForgotPassword() {
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
  }

  return (
    <LoginForm
      email={email}
      password={password}
      errorMessage={errorMessage}
      isSubmitting={isSubmitting}
      isResettingPassword={isResettingPassword}
      hasSupabaseConfig={hasSupabaseConfig}
      onChangeEmail={(text) => {
        setEmail(text);
        setErrorMessage(null);
      }}
      onChangePassword={(text) => {
        setPassword(text);
        setErrorMessage(null);
      }}
      onSubmit={handleLogin}
      onForgotPassword={handleForgotPassword}
    />
  );
}
