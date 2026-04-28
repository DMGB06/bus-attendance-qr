import { supabase } from "@/src/lib/supabase";
import type { AttendanceEventType, AttendanceRecord } from "@/src/types";

export type PendingDropoffStudent = {
  id: string;
  nombre_alumno: string;
  codigo: string | null;
};

function mapAttendanceInsertError(code?: string) {
  if (code === "23505") {
    return "Ya registrado";
  }

  if (code === "23503") {
    return "No se pudo registrar: alumno o viaje inválido.";
  }

  return "No se pudo registrar la asistencia.";
}

export async function registerAttendance(
  tripId: string,
  studentId: string,
  eventType: AttendanceEventType,
): Promise<AttendanceRecord> {
  const { data, error } = await supabase
    .from("bus_attendance_records")
    .insert({
      trip_id: tripId,
      student_id: studentId,
      event_type: eventType,
      scanned_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(mapAttendanceInsertError(error?.code));
  }

  return data;
}

export async function markManualAttendance(
  tripId: string,
  studentId: string,
): Promise<AttendanceRecord> {
  return registerAttendance(tripId, studentId, "manual");
}

export async function getAttendanceByTrip(tripId: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from("bus_attendance_records")
    .select("*")
    .eq("trip_id", tripId)
    .order("scanned_at", { ascending: true });

  if (error || !data) {
    throw new Error("No se pudo cargar la asistencia del viaje.");
  }

  return data;
}

export async function getPendingDropoffStudents(tripId: string): Promise<PendingDropoffStudent[]> {
  const { data: attendanceRows, error: attendanceError } = await supabase
    .from("bus_attendance_records")
    .select("student_id, event_type")
    .eq("trip_id", tripId)
    .in("event_type", ["boarded", "alighted", "manual"]);

  if (attendanceError) {
    throw new Error("No se pudo validar el estado de asistencia para cerrar el viaje.");
  }

  const boardedSet = new Set<string>();
  const alightedSet = new Set<string>();

  for (const row of attendanceRows ?? []) {
    if (row.event_type === "boarded" || row.event_type === "manual") {
      boardedSet.add(row.student_id);
    }

    if (row.event_type === "alighted") {
      alightedSet.add(row.student_id);
    }
  }

  const pendingIds = [...boardedSet].filter((studentId) => !alightedSet.has(studentId));
  if (!pendingIds.length) {
    return [];
  }

  const { data: students, error: studentsError } = await supabase
    .from("social_bus_escolar")
    .select("id, nombre_alumno, codigo")
    .in("id", pendingIds);

  if (studentsError) {
    throw new Error("No se pudo obtener los alumnos pendientes de bajada.");
  }

  return (students ?? []).map((student) => ({
    id: student.id,
    nombre_alumno: student.nombre_alumno,
    codigo: student.codigo,
  }));
}
