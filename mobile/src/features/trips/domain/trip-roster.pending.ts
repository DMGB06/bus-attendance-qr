import type { PendingDropoffStudent } from "@/src/features/trips/services/attendance.service";
import type { TripRosterItem } from "@/src/features/trips/services/trip-roster.service";

export function getOnboardStudentsFromRoster(
  items: TripRosterItem[],
): PendingDropoffStudent[] {
  return items
    .filter((item) => item.status === "onboard")
    .map((item) => ({
      id: item.student.id,
      nombre_alumno: item.student.nombre_alumno,
      codigo: item.student.codigo,
    }));
}
