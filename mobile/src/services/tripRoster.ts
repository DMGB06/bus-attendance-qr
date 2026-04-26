import { supabase } from "@/src/lib/supabase";
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
    throw new Error(studentsResult.error.message);
  }

  if (attendanceResult.error) {
    throw new Error(attendanceResult.error.message);
  }

  const attendanceByStudent = new Map<string, AttendanceRecord>();
  for (const record of attendanceResult.data ?? []) {
    if (!attendanceByStudent.has(record.student_id)) {
      attendanceByStudent.set(record.student_id, record);
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
