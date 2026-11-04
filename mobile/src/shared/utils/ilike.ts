/**
 * Quita comodines del término de búsqueda.
 * PostgREST `.ilike()` no envía ESCAPE; sin esto `%` devolvería todo el padrón.
 */
export function sanitizeIlikeSearchTerm(value: string): string {
  return value.trim().replace(/[%_\\]/g, "");
}
