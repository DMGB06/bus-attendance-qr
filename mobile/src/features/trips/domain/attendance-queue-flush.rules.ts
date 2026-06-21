/** Evita leer/sincronizar la cola offline cuando no hay pendientes. */
export function shouldFlushAttendanceQueueBeforeRefresh(
  pendingCount: number,
  skipQueueFlush?: boolean,
): boolean {
  if (skipQueueFlush) {
    return false;
  }

  return pendingCount > 0;
}
