import { supabase } from "@/src/core/config/supabase";
import { getStudentsByIds } from "@/src/features/trips/services/students.service";
import { getGuardianLinksForUser } from "@/src/features/parent/services/guardians.service";
import { getTodayDateIso } from "@/src/features/parent/utils/date";
import type { ParentChildSummary, StudentTripStatus } from "@/src/features/parent/types";
import type { Trip } from "@/src/features/trips/types";

async function fetchTodayStatuses(studentIds: string[]): Promise<StudentTripStatus[]> {
  if (!studentIds.length) {
    return [];
  }

  const today = getTodayDateIso();
  const { data, error } = await supabase
    .from("student_trip_status")
    .select("*")
    .in("student_id", studentIds)
    .eq("trip_date", today);

  if (error) {
    throw new Error("No se pudo consultar el estado de hoy.");
  }

  return (data ?? []) as StudentTripStatus[];
}

async function fetchTripsByIds(tripIds: string[]): Promise<Trip[]> {
  if (!tripIds.length) {
    return [];
  }

  const { data, error } = await supabase.from("bus_trips").select("*").in("id", tripIds);

  if (error) {
    throw new Error("No se pudieron cargar los viajes del día.");
  }

  return data ?? [];
}

export async function getParentChildrenWithStatus(userId: string): Promise<ParentChildSummary[]> {
  const links = await getGuardianLinksForUser(userId);

  if (!links.length) {
    return [];
  }

  const studentIds = links.map((link) => link.student_id);
  const [students, statuses] = await Promise.all([
    getStudentsByIds(studentIds),
    fetchTodayStatuses(studentIds),
  ]);

  const studentMap = new Map(students.map((student) => [student.id, student]));
  const statusByStudent = new Map(statuses.map((status) => [status.student_id, status]));
  const tripIds = [...new Set(statuses.map((status) => status.trip_id))];
  const trips = await fetchTripsByIds(tripIds);
  const tripMap = new Map(trips.map((trip) => [trip.id, trip]));

  return links
    .map((link) => {
      const student = studentMap.get(link.student_id);

      if (!student) {
        return null;
      }

      const todayStatus = statusByStudent.get(link.student_id) ?? null;
      const activeTrip = todayStatus ? tripMap.get(todayStatus.trip_id) ?? null : null;

      return {
        link,
        student,
        todayStatus,
        activeTrip,
      };
    })
    .filter((item): item is ParentChildSummary => item !== null);
}
