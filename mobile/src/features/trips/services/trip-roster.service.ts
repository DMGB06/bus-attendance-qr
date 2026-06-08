import { supabase } from "@/src/core/config/supabase";
import {
  markManualAttendance,
  registerDropoffAttendance,
} from "@/src/features/trips/services/attendance.service";
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
};

export async function getTripRosterRaw(tripId: string): Promise<{
  students: Student[];
  attendanceRecords: AttendanceRecord[];
}> {
  const [studentsResult, attendanceResult] = await Promise.all([
    supabase.from("social_bus_escolar").select("*").order("nombre_alumno"),
    supabase
      .from("bus_attendance_records")
      .select("*")
      .eq("trip_id", tripId)
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
}

export async function getTripRoster(tripId: string): Promise<TripRosterItem[]> {
  const { students, attendanceRecords } = await getTripRosterRaw(tripId);
  await saveCachedStudents(students);
  await saveCachedTripAttendance(tripId, attendanceRecords);
  return buildRosterItemsFromSources(tripId, students, attendanceRecords);
}

export async function markStudentManually(tripId: string, studentId: string): Promise<void> {
  await markManualAttendance(tripId, studentId);
}

export async function markStudentExit(tripId: string, studentId: string): Promise<void> {
  await registerDropoffAttendance(tripId, studentId);
}

export { buildTripRosterItems };
