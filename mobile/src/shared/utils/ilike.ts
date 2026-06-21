/** Escapa `%` y `_` para patrones ILIKE con cláusula ESCAPE (SQL directo / RPC). */
export function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Quita comodines del término de búsqueda.
 * PostgREST `.ilike()` no envía ESCAPE; sin esto `%` devolvería todo el padrón.
 */
export function sanitizeIlikeSearchTerm(value: string): string {
  return value.trim().replace(/[%_\\]/g, "");
}
