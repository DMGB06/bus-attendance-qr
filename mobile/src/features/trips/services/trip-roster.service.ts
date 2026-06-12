import { supabase, supabasePublic } from "@/src/core/config/supabase";
import { perfAsync } from "@/src/shared/utils/perfMark";
import {
  markManualAttendance,
  registerDropoffAttendance,
} from "@/src/features/trips/services/attendance.service";
import { getScanContextForCurrentUser } from "@/src/features/trips/services/crew.service";
import { buildTripRosterItems } from "@/src/features/trips/domain/trip-roster.builder";
import { buildRosterItemsFromSources } from "@/src/features/trips/services/attendance-registration.service";
import { saveCachedStudents, saveCachedTripAttendance } from "@/src/features/trips/storage/roster-cache.storage";
import type { AttendanceRecord, Student } from "@/src/features/trips/types";

export type TripRosterStatus = "pending" | "onboard" | "completed";

export type TripRosterItem = {
  student: Student;
  attendance: AttendanceRecord | null;
  status: TripRosterStatus;
  hasAttendance: boolean;
  canMarkManual: boolean;
  canMarkExit: boolean;
  isPendingSync: boolean;
  pendingScannedBy: string | null;
};

export async function getTripRosterRaw(tripId: string): Promise<{
  students: Student[];
  attendanceRecords: AttendanceRecord[];
}> {
  return perfAsync("getTripRosterRaw", async () => {
    const [studentsResult, attendanceResult] = await Promise.all([
      supabasePublic
        .from("social_bus_escolar")
        .select(
          "id, nombre_alumno, dni_alumno, edad, sexo, colegio, nivel_educativo, nombre_apoderado, telefono_apoderado, dni_apoderado, direccion, usuario_registro, created_at, codigo, foto_url, activo, notas",
        )
        .order("nombre_alumno"),
      supabase
        .from("bus_attendance_records")
        .select(
          "id, trip_id, student_id, event_type, scanned_at, lat, lng, operator_id, is_offline_sync, scanned_by, scan_role, voided_at, voided_by, void_reason",
        )
        .eq("trip_id", tripId)
        .is("voided_at", null)
        .order("scanned_at", { ascending: true }),
    ]);

    if (studentsResult.error) {
      throw new Error("No se pudo cargar la lista de alumnos.");
    }

    if (attendanceResult.error) {
      throw new Error("No se pudo cargar la asistencia del viaje.");
    }

    return {
      students: studentsResult.data ?? [],
      attendanceRecords: attendanceResult.data ?? [],
    };
  }, { tripId });
}

export async function getTripAttendanceOnly(tripId: string): Promise<AttendanceRecord[]> {
  return perfAsync("getTripAttendanceOnly", async () => {
    const { data, error } = await supabase
      .from("bus_attendance_records")
      .select(
        "id, trip_id, student_id, event_type, scanned_at, lat, lng, operator_id, is_offline_sync, scanned_by, scan_role, voided_at, voided_by, void_reason",
      )
      .eq("trip_id", tripId)
      .is("voided_at", null)
      .order("scanned_at", { ascending: true });

    if (error) {
      throw new Error("No se pudo cargar la asistencia del viaje.");
    }

    return data ?? [];
  }, { tripId });
}

export async function getTripRoster(tripId: string): Promise<TripRosterItem[]> {
  const { students, attendanceRecords } = await getTripRosterRaw(tripId);
  await saveCachedStudents(students);
  await saveCachedTripAttendance(tripId, attendanceRecords);
  return buildRosterItemsFromSources(tripId, students, attendanceRecords);
}

export async function markStudentManually(tripId: string, studentId: string): Promise<void> {
  const scan = await getScanContextForCurrentUser();
  await markManualAttendance(tripId, studentId, scan);
}

export async function markStudentExit(tripId: string, studentId: string): Promise<void> {
  const scan = await getScanContextForCurrentUser();
  await registerDropoffAttendance(tripId, studentId, scan);
}

export { buildTripRosterItems };
