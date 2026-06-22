import { Stack } from 'expo-router';

import { fadeScreenOptions } from '@/src/core/navigation/screenTransitions';

export default function ParentLayout() {
  return (
    <Stack screenOptions={fadeScreenOptions}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="child/[id]" />
      <Stack.Screen name="index" />
    </Stack>
  );
}
