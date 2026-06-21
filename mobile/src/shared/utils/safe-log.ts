/** Mensaje de error sin volcar objetos que puedan incluir tokens o sesión. */
export function toSafeLogMessage(error: unknown, fallback = "error desconocido"): string {
  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === "string") {
    return error;
  }

  return fallback;
}
