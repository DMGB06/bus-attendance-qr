import { Redirect } from 'expo-router';

import { OPS_ROUTES } from '@/src/core/routes';

export default function IndexScreen() {
  return <Redirect href={OPS_ROUTES.trip} />;
}
