import { supabase, supabasePublic } from "@/src/core/config/supabase";
import type { ScanContext } from "@/src/features/trips/services/crew.service";
import type { AttendanceEventType, AttendanceRecord } from "@/src/features/trips/types";

export type PendingDropoffStudent = {
  id: string;
  nombre_alumno: string;
  codigo: string | null;
  direccion: string | null;
};

function mapAttendanceRpcError(message?: string, code?: string) {
  if (code === "23505" || message?.includes("Ya registrado")) {
    return "Ya registrado";
  }

  if (code === "23503") {
    return "No se pudo registrar: alumno o viaje inválido.";
  }

  return message || "No se pudo registrar la asistencia.";
}

export async function registerAttendance(
  tripId: string,
  studentId: string,
  eventType: AttendanceEventType,
  scan?: ScanContext,
): Promise<AttendanceRecord> {
  const { data, error } = await supabase.rpc("register_attendance", {
    p_trip_id: tripId,
    p_student_id: studentId,
    p_event_type: eventType,
    p_scan_role: scan?.scanRole ?? null,
  });

  if (error || !data) {
    throw new Error(mapAttendanceRpcError(error?.message, error?.code));
  }

  return data as AttendanceRecord;
}

export async function markManualAttendance(
  tripId: string,
  studentId: string,
  scan?: ScanContext,
): Promise<AttendanceRecord> {
  return registerAttendance(tripId, studentId, "manual", scan);
}

export async function registerDropoffAttendance(
  tripId: string,
  studentId: string,
  scan?: ScanContext,
): Promise<AttendanceRecord> {
  return registerAttendance(tripId, studentId, "bajo", scan);
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

export async function voidAttendanceRecord(recordId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("void_attendance_record", {
    p_record_id: recordId,
    p_reason: reason,
  });

  if (error) {
    throw new Error(error.message || "No se pudo anular el registro.");
  }
}

export async function getPendingDropoffStudents(tripId: string): Promise<PendingDropoffStudent[]> {
  const { data: attendanceRows, error: attendanceError } = await supabase
    .from("bus_attendance_records")
    .select("student_id, event_type")
    .eq("trip_id", tripId)
    .is("voided_at", null)
    .in("event_type", ["subio", "bajo", "manual", "ausente"]);

  if (attendanceError) {
    throw new Error("No se pudo validar el estado de asistencia para cerrar el viaje.");
  }

  const boardedSet = new Set<string>();
  const alightedSet = new Set<string>();

  for (const row of attendanceRows ?? []) {
    if (row.event_type === "subio" || row.event_type === "manual") {
      boardedSet.add(row.student_id);
    }

    if (row.event_type === "bajo") {
      alightedSet.add(row.student_id);
    }
  }

  const pendingIds = [...boardedSet].filter((studentId) => !alightedSet.has(studentId));
  if (!pendingIds.length) {
    return [];
  }

  const { data: students, error: studentsError } = await supabasePublic
    .from("social_bus_escolar")
    .select("id, nombre_alumno, codigo, direccion")
    .in("id", pendingIds);

  if (studentsError) {
    throw new Error("No se pudo obtener los alumnos pendientes de bajada.");
  }

  return (students ?? [])
    .map((student) => ({
      id: student.id,
      nombre_alumno: student.nombre_alumno,
      codigo: student.codigo,
      direccion: student.direccion,
    }))
    .sort((left, right) => left.nombre_alumno.localeCompare(right.nombre_alumno, "es"));
}
