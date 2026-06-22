import { Stack } from 'expo-router';

import { fadeScreenOptions } from '@/src/core/navigation/screenTransitions';
import { useAppTheme } from '@/src/core/theme/ThemeProvider';

export default function AuthLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        ...fadeScreenOptions,
        contentStyle: { flex: 1, backgroundColor: colors.screenSolid },
      }}
    >
      <Stack.Screen name="login" />
    </Stack>
  );
}
