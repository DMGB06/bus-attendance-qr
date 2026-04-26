// src/services/attendance.ts

import { supabase } from "@/src/lib/supabase";
import type { AttendanceRecord, AttendanceEventType } from "@/src/types";

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
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo registrar la asistencia.");
  }

  return data;
}

export async function getAttendanceByTrip(
  tripId: string,
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from("bus_attendance_records")
    .select("*")
    .eq("trip_id", tripId)
    .order("scanned_at", { ascending: true });

  if (error || !data) return [];
  return data;
}
