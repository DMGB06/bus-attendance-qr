/** Poll de respaldo solo mientras Realtime no está conectado. */
export function shouldPollParentBusLocations(realtimeStatus: string | null | undefined): boolean {
  return realtimeStatus !== "SUBSCRIBED";
}
