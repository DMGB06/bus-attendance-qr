import { shouldPollWhenRealtimeDisconnected } from "@/src/features/parent/domain/parent-realtime-sync.rules";

/** Poll de respaldo solo mientras Realtime no está conectado. */
export function shouldPollParentBusLocations(realtimeStatus: string | null | undefined): boolean {
  return shouldPollWhenRealtimeDisconnected(realtimeStatus);
}
