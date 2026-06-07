import { confirmAlert } from "@/src/shared/utils/confirmAlert";

export function confirmManualAttendance(studentName: string) {
  return confirmAlert({
    title: "Confirmar registro manual",
    message: `¿Registrar manualmente a ${studentName}?\n\nEsta acción no se puede deshacer desde esta pantalla.`,
  });
}

export function confirmStudentDropoff(studentName: string) {
  return confirmAlert({
    title: "Confirmar salida",
    message: `¿Registrar salida para ${studentName}?`,
  });
}

export function confirmCloseWithPendingStudents(studentNames: string[], totalPending: number) {
  const hasMoreStudents = totalPending > studentNames.length;
  const shownList = studentNames.join(", ");
  const summaryLine = hasMoreStudents
    ? `${shownList} y ${totalPending - studentNames.length} más`
    : shownList;

  return confirmAlert({
    title: "Hay alumnos sin bajada",
    message: `Aún hay ${totalPending} alumno(s) con abordo sin registro de bajada.\n\n${summaryLine}\n\n¿Deseas cerrar el viaje de todas formas?`,
    confirmLabel: "Cerrar viaje",
    destructive: true,
  });
}
