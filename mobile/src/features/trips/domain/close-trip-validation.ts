export type CloseTripStudentRef = {
  id: string;
  nombre_alumno: string;
  direccion: string | null;
  codigo: string | null;
};

export type CloseTripValidationResult = {
  pendingDropoff: CloseTripStudentRef[];
  missingPrioritarios: CloseTripStudentRef[];
  /** Aviso cuando se usaron datos locales por timeout o red lenta. */
  connectivityWarning?: string | null;
};

export function sortCloseTripStudents(students: CloseTripStudentRef[]): CloseTripStudentRef[] {
  return [...students].sort((left, right) =>
    left.nombre_alumno.localeCompare(right.nombre_alumno, "es"),
  );
}

export function hasPendingDropoffIssues(validation: CloseTripValidationResult): boolean {
  return validation.pendingDropoff.length > 0;
}

export function hasMissingPrioritarios(validation: CloseTripValidationResult): boolean {
  return validation.missingPrioritarios.length > 0;
}

export function toCloseTripStudentRef(input: {
  id: string;
  nombre_alumno: string;
  direccion?: string | null;
  codigo?: string | null;
}): CloseTripStudentRef {
  return {
    id: input.id,
    nombre_alumno: input.nombre_alumno,
    direccion: input.direccion ?? null,
    codigo: input.codigo ?? null,
  };
}
