import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { flex: 1, backgroundColor: '#0f141d' },
      }}
    >
      <Stack.Screen name="login" />
    </Stack>
  );
}
