import { Stack } from 'expo-router';

import { fadeScreenOptions } from '@/src/core/navigation/screenTransitions';

export default function OpsLayout() {
  return <Stack screenOptions={fadeScreenOptions} />;
}
