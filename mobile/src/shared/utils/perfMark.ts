/**
 * Marcas de rendimiento (Fase 0 / 8 del plan de afinamiento).
 * Desactivadas por defecto tras Fase 8 — no impactan builds ni Metro en dev normal.
 *
 * Re-activar para diagnóstico: `EXPO_PUBLIC_PERF_MARKS=true` en `.env` y reiniciar Expo.
 * Buscar en Metro: `[Perf]` · volcado: `global.__busControlPerfDump?.()`
 */

export const isPerfMarksEnabled = (): boolean =>
  process.env.EXPO_PUBLIC_PERF_MARKS === "true";

const PERF_ENABLED = isPerfMarksEnabled();
const LOG_PREFIX = "[Perf]";

export type PerfMark = {
  label: string;
  durationMs: number;
  at: string;
  meta?: Record<string, unknown>;
};

const recentMarks: PerfMark[] = [];
const MAX_RECENT_MARKS = 80;
let bootReadyLogged = false;

function pushMark(label: string, durationMs: number, meta?: Record<string, unknown>) {
  recentMarks.push({
    label,
    durationMs: Math.round(durationMs),
    at: new Date().toISOString(),
    meta,
  });
  if (recentMarks.length > MAX_RECENT_MARKS) {
    recentMarks.shift();
  }
}

export function perfStart(label: string, meta?: Record<string, unknown>): () => void {
  if (!PERF_ENABLED) {
    return () => undefined;
  }

  const startedAt = performance.now();
  if (meta) {
    console.log(`${LOG_PREFIX} ▶ ${label}`, meta);
  } else {
    console.log(`${LOG_PREFIX} ▶ ${label}`);
  }

  return () => {
    const durationMs = performance.now() - startedAt;
    pushMark(label, durationMs, meta);
    console.log(`${LOG_PREFIX} ✓ ${label} ${Math.round(durationMs)}ms`);
  };
}

export async function perfAsync<T>(
  label: string,
  fn: () => Promise<T>,
  meta?: Record<string, unknown>,
): Promise<T> {
  if (!PERF_ENABLED) {
    return fn();
  }

  const end = perfStart(label, meta);
  try {
    return await fn();
  } finally {
    end();
  }
}

export function perfMarkBootReady(startedAt: number): void {
  if (!PERF_ENABLED || bootReadyLogged) {
    return;
  }

  bootReadyLogged = true;
  const durationMs = performance.now() - startedAt;
  pushMark("boot.ready", durationMs);
  console.log(`${LOG_PREFIX} ✓ boot.ready ${Math.round(durationMs)}ms (splash oculto → tab Viaje)`);
}

export function perfMarkScreenFocus(screenName: string): void {
  if (!PERF_ENABLED) {
    return;
  }
  console.log(`${LOG_PREFIX} ◉ screen.focus ${screenName}`);
}

export function perfMarkScreenReady(screenName: string, focusStartedAt: number): void {
  if (!PERF_ENABLED) {
    return;
  }

  const durationMs = performance.now() - focusStartedAt;
  pushMark(`screen.ready.${screenName}`, durationMs);
  console.log(
    `${LOG_PREFIX} ✓ screen.ready.${screenName} ${Math.round(durationMs)}ms (focus → interacciones listas)`,
  );
}

/** Útil en consola de Metro: `global.__busControlPerfDump?.()` */
export function getRecentPerfMarks(): readonly PerfMark[] {
  return recentMarks;
}

if (PERF_ENABLED) {
  (globalThis as typeof globalThis & { __busControlPerfDump?: () => readonly PerfMark[] }).__busControlPerfDump =
    getRecentPerfMarks;
}
