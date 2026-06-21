const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value.trim());
}

/** Filtra IDs válidos; ignora strings malformados antes de `.in()` en PostgREST. */
export function filterValidUuids(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(isUuid))];
}
