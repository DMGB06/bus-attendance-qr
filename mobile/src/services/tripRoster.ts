import { supabase } from "@/src/lib/supabase";
import { markManualAttendance } from "@/src/services/attendace";
import type { AttendanceRecord, Student } from "@/src/types";

export type TripRosterStatus = "registered" | "pending";

export type TripRosterItem = {
  student: Student;
  attendance: AttendanceRecord | null;
  status: TripRosterStatus;
};

export async function getTripRoster(tripId: string): Promise<TripRosterItem[]> {
  const [studentsResult, attendanceResult] = await Promise.all([
    supabase.from("social_bus_escolar").select("*").order("nombre_alumno"),
    supabase
      .from("bus_attendance_records")
      .select("*")
      .eq("trip_id", tripId)
      .order("scanned_at", { ascending: false }),
  ]);

  if (studentsResult.error) {
    throw new Error("No se pudo cargar la lista de alumnos.");
  }

  if (attendanceResult.error) {
    throw new Error("No se pudo cargar la asistencia del viaje.");
  }

  const attendanceByStudent = new Map<string, AttendanceRecord>();
  for (const attendance of attendanceResult.data ?? []) {
    if (!attendanceByStudent.has(attendance.student_id)) {
      attendanceByStudent.set(attendance.student_id, attendance);
    }
  }

  return (studentsResult.data ?? []).map((student) => {
    const attendance = attendanceByStudent.get(student.id) ?? null;
    return {
      student,
      attendance,
      status: attendance ? "registered" : "pending",
    };
  });
}

export async function markStudentManually(tripId: string, studentId: string): Promise<void> {
  await markManualAttendance(tripId, studentId);
}
