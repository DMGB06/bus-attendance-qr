import { isUuid } from "@/src/shared/utils/uuid";

/** Los datos llegan de fuera de la app: solo se acepta un id real para armar la ruta. */
export function getNotificationChildId(data: unknown): string | null {
  const studentId = (data as { student_id?: unknown } | null)?.student_id;
  return typeof studentId === "string" && isUuid(studentId) ? studentId : null;
}
