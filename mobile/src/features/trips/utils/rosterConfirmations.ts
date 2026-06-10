import type { CloseTripStudentRef } from "@/src/features/trips/domain/close-trip-validation";
import type { TripDirection } from "@/src/features/trips/types";
import {
  getCloseWithPendingMessage,
  getCloseWithPendingTitle,
  getDropoffConfirmMessage,
  getDropoffConfirmTitle,
} from "@/src/features/trips/domain/trip-labels";
import { confirmAlert } from "@/src/shared/utils/confirmAlert";

export function confirmManualAttendance(studentName: string) {
  return confirmAlert({
    title: "Confirmar registro manual",
    message: `¿Registrar manualmente a ${studentName}?\n\nEsta acción no se puede deshacer desde esta pantalla.`,
  });
}

export function confirmStudentDropoff(studentName: string, direction: TripDirection) {
  return confirmAlert({
    title: getDropoffConfirmTitle(direction),
    message: getDropoffConfirmMessage(studentName, direction),
  });
}

export function confirmCloseWithPendingStudents(
  students: Pick<CloseTripStudentRef, "nombre_alumno" | "direccion">[],
  totalPending: number,
  direction: TripDirection,
) {
  return confirmAlert({
    title: getCloseWithPendingTitle(direction),
    message: getCloseWithPendingMessage(students, totalPending, direction),
    confirmLabel: "Cerrar de todas formas",
    cancelLabel: "Volver a revisar",
    destructive: true,
  });
}

export function confirmBulkSchoolDropoff(count: number) {
  return confirmBulkDropoff(count, "recojo");
}

export function confirmBulkHomeDropoff(count: number) {
  return confirmBulkDropoff(count, "retorno");
}

export function confirmBulkDropoff(count: number, direction: TripDirection) {
  const place = direction === "recojo" ? "colegio" : "casa";
  return confirmAlert({
    title: direction === "recojo" ? "Dejar todos en colegio" : "Dejar todos en casa",
    message: `¿Registrar ${count} alumno(s) dejados en ${place}?`,
    confirmLabel: "Registrar todos",
  });
}

export function confirmStudentAbsent(studentName: string) {
  return confirmAlert({
    title: "Marcar como ausente",
    message: `¿Registrar que ${studentName} no vendrá en este tramo tarde?`,
    confirmLabel: "Marcar ausente",
  });
}
