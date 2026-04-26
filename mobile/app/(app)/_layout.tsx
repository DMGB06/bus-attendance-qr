import { Stack } from 'expo-router';

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
        }}
      />
    </Stack>
  );
}