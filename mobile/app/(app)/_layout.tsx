import { Stack } from 'expo-router';
import { colors } from '@/src/theme/theme';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="close-trip"
        options={{
          headerShown: true,
          title: 'Cerrar viaje',
          presentation: 'modal',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { color: colors.textPrimary },
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
