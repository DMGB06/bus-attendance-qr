/**
 * Reglas de alta padre ↔ alumno (Fase 3.1).
 * El coordinador valida que el DNI del apoderado coincida con el padrón municipal.
 */

export function normalizeDni(value: string): string {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export function guardianDniMatchesPadron(
  guardianDni: string,
  studentDniApoderado: string | null | undefined,
): boolean {
  const normalizedGuardian = normalizeDni(guardianDni);
  const normalizedPadron = normalizeDni(studentDniApoderado ?? "");

  if (!normalizedGuardian || !normalizedPadron) {
    return false;
  }

  return normalizedGuardian === normalizedPadron;
}
