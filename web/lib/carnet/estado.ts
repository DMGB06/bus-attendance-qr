export type EstadoCarnet = "vigente" | "vencido" | "reemplazado" | "reportado_perdido";

// El año se evalúa en hora de Lima, no en UTC: un carnet emitido el 31/12 a las 22:00 en Lima
// ya es del año siguiente en UTC.
const anioLima = (d: Date) => Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric" }).format(d));

// Un carnet vigente de un año anterior está vencido (R-Q6). No se aplica en el móvil.
export function estadoCarnet(c: { status: string; issued_at: string }, hoy = new Date()): EstadoCarnet {
  if (c.status !== "vigente") return c.status === "reportado_perdido" ? "reportado_perdido" : "reemplazado";
  return anioLima(new Date(c.issued_at)) < anioLima(hoy) ? "vencido" : "vigente";
}

export const anioCarnet = (issuedAt: string) => anioLima(new Date(issuedAt));

export const anioActual = () => anioLima(new Date());
