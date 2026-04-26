import { Redirect } from 'expo-router';

export default function ScannerRedirect() {
  return <Redirect href="/(app)/(tabs)/scan-tab" />;
}
