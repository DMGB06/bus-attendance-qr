/** Errores RPC de asignación al bus (pre-020 o cola offline fallida). */
export function isOperatorPermissionError(message: string | null | undefined): boolean {
  if (!message?.trim()) {
    return false;
  }

  const normalized = message.toLowerCase();
  return (
    normalized.includes("no estás asignado") ||
    normalized.includes("no estas asignado") ||
    normalized.includes("no tienes un bus asignado") ||
    normalized.includes("no tienes permiso para cerrar")
  );
}
