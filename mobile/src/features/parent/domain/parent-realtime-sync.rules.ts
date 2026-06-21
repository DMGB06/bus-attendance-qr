/** Poll de respaldo mientras Realtime no está conectado (SUBSCRIBED). */
export function shouldPollWhenRealtimeDisconnected(
  realtimeStatus: string | null | undefined,
): boolean {
  return realtimeStatus !== "SUBSCRIBED";
}

export const PARENT_CHILDREN_POLL_INTERVAL_MS = 20_000;
