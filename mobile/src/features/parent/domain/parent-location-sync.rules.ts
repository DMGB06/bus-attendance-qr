import { shouldRunForegroundPoll } from "@/src/features/parent/domain/parent-realtime-sync.rules";

/** Poll de respaldo solo mientras Realtime no está conectado y la app está en pantalla. */
export function shouldPollParentBusLocations(
  realtimeStatus: string | null | undefined,
  isForeground: boolean,
): boolean {
  return shouldRunForegroundPoll(realtimeStatus, isForeground);
}
