import { supabase } from "@/src/lib/supabase";
import { markManualAttendance, registerDropoffAttendance } from "@/src/services/attendace";
import type { AttendanceRecord, Student } from "@/src/types";

export type TripRosterStatus = "pending" | "onboard" | "completed";

export type TripRosterItem = {
  student: Student;
  attendance: AttendanceRecord | null;
  status: TripRosterStatus;
  hasAttendance: boolean;
  canMarkManual: boolean;
  canMarkExit: boolean;
};

export async function getTripRoster(tripId: string): Promise<TripRosterItem[]> {
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

  const attendanceByStudent = new Map<string, AttendanceRecord[]>();
  for (const attendance of attendanceResult.data ?? []) {
    const history = attendanceByStudent.get(attendance.student_id) ?? [];
    history.push(attendance);
    attendanceByStudent.set(attendance.student_id, history);
  }

  return (studentsResult.data ?? []).map((student) => {
    const history = attendanceByStudent.get(student.id) ?? [];
    const attendance = history.length > 0 ? history[history.length - 1] : null;

    const hasBoarding = history.some(
      (record) => record.event_type === "boarded" || record.event_type === "manual",
    );
    const hasDropoff = history.some((record) => record.event_type === "alighted");

    let status: TripRosterStatus = "pending";
    if (hasDropoff) {
      status = "completed";
    } else if (hasBoarding) {
      status = "onboard";
    }

    return {
      student,
      attendance,
      status,
      hasAttendance: history.length > 0,
      canMarkManual: status === "pending",
      canMarkExit: status === "onboard",
    };
  });
}

export async function markStudentManually(tripId: string, studentId: string): Promise<void> {
  await markManualAttendance(tripId, studentId);
}

export async function markStudentExit(tripId: string, studentId: string): Promise<void> {
  await registerDropoffAttendance(tripId, studentId);
}
