// Limites de la sesion del panel. El JWT dura 1 hora y se renueva solo: sin esto la sesion no terminaria nunca.
export const IDLE_SECONDS = 20 * 60;
export const MAX_SECONDS = 8 * 60 * 60;
export const ACTIVITY_COOKIE = "cb-activity";

// Tiempos en segundos Unix; 0 significa "sin dato" y no vence.
export function sessionExpired(now: number, lastActivity: number, authenticatedAt: number) {
  return (lastActivity > 0 && now - lastActivity > IDLE_SECONDS) || (authenticatedAt > 0 && now - authenticatedAt > MAX_SECONDS);
}
