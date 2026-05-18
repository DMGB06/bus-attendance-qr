import { Stack } from 'expo-router';

import { useAppTheme } from '@/src/core/theme/ThemeProvider';

export default function AuthLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { flex: 1, backgroundColor: colors.screenSolid },
      }}
    >
      <Stack.Screen name="login" />
    </Stack>
  );
}
