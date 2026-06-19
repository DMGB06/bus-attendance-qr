import { supabase } from "@/src/core/config/supabase";
import { getUser } from "@/src/features/auth/services/auth.service";
import { isSingleBusPilotMode } from "@/src/features/trips/services/crew.service";
import { getWeekDateRange, buildDayOptions, getTodayDateIso } from "@/src/features/trips/domain/activity-grouping";
import type { OperatorActivityRow } from "@/src/features/trips/types/activity.types";
import type { AttendanceEventType, TripDirection, TurnType } from "@/src/features/trips/types";

type OperatorActivityRpcRow = {
  record_id: string;
  trip_id: string;
  trip_date: string;
  trip_direction: string;
  turn_type: string | null;
  trip_status: string;
  student_id: string;
  student_name: string;
  event_type: string;
  scanned_at: string | null;
  scanned_by: string | null;
  voided_at: string | null;
  is_offline_sync: boolean;
};

function formatSupabaseError(
  prefix: string,
  err: { message: string; details?: string; hint?: string; code?: string },
) {
  const parts = [err.message, err.details, err.hint].filter(Boolean);
  return `${prefix}${parts.length ? `: ${parts.join(" — ")}` : ""}${err.code ? ` [${err.code}]` : ""}`;
}

function mapRpcRow(row: OperatorActivityRpcRow): OperatorActivityRow {
  return {
    recordId: row.record_id,
    tripId: row.trip_id,
    tripDate: row.trip_date,
    tripDirection: row.trip_direction as TripDirection,
    turnType: (row.turn_type as TurnType | null) ?? null,
    tripStatus: row.trip_status,
    studentId: row.student_id,
    studentName: row.student_name,
    eventType: row.event_type as AttendanceEventType,
    scannedAt: row.scanned_at,
    scannedBy: row.scanned_by,
    voidedAt: row.voided_at,
    isOfflineSync: row.is_offline_sync,
  };
}

export async function getOperatorActivityRange(
  startDate: string,
  endDate: string,
): Promise<OperatorActivityRow[]> {
  const { data, error } = await supabase.rpc("get_operator_activity_range", {
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    throw new Error(formatSupabaseError("No se pudo cargar el historial", error));
  }

  return ((data ?? []) as OperatorActivityRpcRow[]).map(mapRpcRow);
}

export async function getOperatorAssignmentDates(
  startDate: string,
  endDate: string,
): Promise<Set<string>> {
  const user = await getUser();
  if (!user) {
    return new Set();
  }

  const { data, error } = await supabase
    .from("bus_crew_assignments")
    .select("assignment_date")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .gte("assignment_date", startDate)
    .lte("assignment_date", endDate);

  if (error) {
    throw new Error(formatSupabaseError("No se pudo consultar tus asignaciones", error));
  }

  const assignedDates = new Set((data ?? []).map((row) => row.assignment_date as string));

  if (assignedDates.size === 0 && (await isSingleBusPilotMode())) {
    return new Set(buildDayOptions(getTodayDateIso()).map((option) => option.date));
  }

  return assignedDates;
}

export async function getOperatorActivityWeek(): Promise<{
  rows: OperatorActivityRow[];
  assignedDates: Set<string>;
  startDate: string;
  endDate: string;
}> {
  const user = await getUser();
  if (!user) {
    throw new Error("Debes iniciar sesión para ver el historial.");
  }

  const { startDate, endDate } = getWeekDateRange();
  const [rows, assignedDates] = await Promise.all([
    getOperatorActivityRange(startDate, endDate),
    getOperatorAssignmentDates(startDate, endDate),
  ]);

  return { rows, assignedDates, startDate, endDate };
}
