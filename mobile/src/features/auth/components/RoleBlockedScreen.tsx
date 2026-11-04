import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/src/core/theme/ThemeProvider';
import type { RouteBlockReason } from '@/src/features/auth/hooks/usePostLoginRoute';
import { AppButton } from '@/src/shared/ui/AppButton';

const MESSAGES: Record<RouteBlockReason, { title: string; body: string }> = {
  offline: {
    title: 'No pudimos verificar tu cuenta',
    body: 'Revisa tu conexión a internet e intenta de nuevo.',
  },
  no_access: {
    title: 'Tu cuenta no tiene acceso',
    body: 'Contacta a la municipalidad para que activen tu cuenta y te asignen un rol.',
  },
};

type RoleBlockedScreenProps = {
  reason: RouteBlockReason;
  onRetry: () => void;
  onLogout: () => void;
};

export function RoleBlockedScreen({ reason, onRetry, onLogout }: RoleBlockedScreenProps) {
  const { colors, tokens } = useAppTheme();
  const message = MESSAGES[reason];

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        { backgroundColor: colors.primary, padding: tokens.spacing.xl, gap: tokens.spacing.md },
      ]}
    >
      <Text accessibilityRole="header" style={[styles.title, { color: colors.textOnPrimary }]}>
        {message.title}
      </Text>
      <Text style={[styles.body, { color: colors.textOnPrimary }]}>{message.body}</Text>
      <AppButton mode="contained-tonal" onPress={onRetry}>
        Reintentar
      </AppButton>
      <AppButton mode="text" textColor={colors.textOnPrimary} onPress={onLogout}>
        Cerrar sesión
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 16, textAlign: 'center' },
});
