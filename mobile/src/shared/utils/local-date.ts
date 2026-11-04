/** Zona horaria operativa del piloto Cerro Azul. */
export const APP_TIME_ZONE = "America/Lima";

/**
 * Fecha calendario local (YYYY-MM-DD) para filtros de "hoy" en Supabase.
 * Evita que tras las 19:00 en Perú el día UTC adelante y el padre no vea el viaje.
 */
export function getLocalTodayDateIso(timeZone = APP_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Inicio del dia operativo. Lima no cambia de horario: su desfase es siempre -05:00. */
export function getLocalDayStartIso(today: string): string {
  return `${today}T00:00:00-05:00`;
}
