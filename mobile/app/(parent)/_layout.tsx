import { Stack } from "expo-router";

export default function ParentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { flex: 1 } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="child/[id]" />
      <Stack.Screen name="index" />
    </Stack>
  );
}
