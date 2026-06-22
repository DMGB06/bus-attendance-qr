/** Poll de respaldo mientras Realtime no está conectado (SUBSCRIBED). */
export function shouldPollWhenRealtimeDisconnected(
  realtimeStatus: string | null | undefined,
): boolean {
  return realtimeStatus !== "SUBSCRIBED";
}

/** Poll solo si Realtime falló y la app está en pantalla (ahorra batería en background). */
export function shouldRunForegroundPoll(
  realtimeStatus: string | null | undefined,
  isForeground: boolean,
): boolean {
  return isForeground && shouldPollWhenRealtimeDisconnected(realtimeStatus);
}

export const PARENT_CHILDREN_POLL_INTERVAL_MS = 10_000;
