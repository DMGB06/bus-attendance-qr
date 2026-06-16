import { supabase } from "@/src/core/config/supabase";
import { getGuardianPadronStudents } from "@/src/features/parent/services/guardian-students.service";
import { getGuardianLinksForUser } from "@/src/features/parent/services/guardians.service";
import { getTodayDateIso } from "@/src/features/parent/utils/date";
import { filterValidUuids, isUuid } from "@/src/shared/utils/uuid";
import type { ParentChildSummary, ParentStudentLink, StudentTripStatus } from "@/src/features/parent/types";
import type { Student, Trip } from "@/src/features/trips/types";

function buildChildSummary(
  link: ParentStudentLink,
  student: Student,
  statusByStudent: Map<string, StudentTripStatus>,
  tripMap: Map<string, Trip>,
): ParentChildSummary {
  const todayStatus = statusByStudent.get(student.id) ?? null;
  const activeTrip = todayStatus ? tripMap.get(todayStatus.trip_id) ?? null : null;

  return {
    link: { ...link, student_id: student.id },
    student,
    todayStatus,
    activeTrip,
  };
}

function buildSummariesFromLinksAndStudents(
  links: ParentStudentLink[],
  students: Student[],
  statusByStudent: Map<string, StudentTripStatus>,
  tripMap: Map<string, Trip>,
): ParentChildSummary[] {
  const studentMap = new Map(students.map((student) => [student.id, student]));

  const matched = links
    .map((link) => {
      const student = studentMap.get(link.student_id);
      if (!student) {
        return null;
      }
      return buildChildSummary(link, student, statusByStudent, tripMap);
    })
    .filter((item): item is ParentChildSummary => item !== null);

  if (matched.length > 0) {
    return matched;
  }

  if (students.length === 0) {
    return [];
  }

  const usedStudentIds = new Set<string>();

  return links
    .map((link, index) => {
      const student = students.find((row) => !usedStudentIds.has(row.id)) ?? students[index];

      if (!student || usedStudentIds.has(student.id)) {
        return null;
      }

      usedStudentIds.add(student.id);
      return buildChildSummary(link, student, statusByStudent, tripMap);
    })
    .filter((item): item is ParentChildSummary => item !== null);
}

async function fetchTodayStatuses(studentIds: string[]): Promise<StudentTripStatus[]> {
  const validIds = filterValidUuids(studentIds);
  if (!validIds.length) {
    return [];
  }

  const today = getTodayDateIso();
  const { data, error } = await supabase
    .from("student_trip_status")
    .select("*")
    .in("student_id", validIds)
    .eq("trip_date", today);

  if (error) {
    throw new Error("No se pudo consultar el estado de hoy.");
  }

  return (data ?? []) as StudentTripStatus[];
}

async function fetchTripsByIds(tripIds: string[]): Promise<Trip[]> {
  const validIds = filterValidUuids(tripIds);
  if (!validIds.length) {
    return [];
  }

  const { data, error } = await supabase.from("bus_trips").select("*").in("id", validIds);

  if (error) {
    throw new Error("No se pudieron cargar los viajes del día.");
  }

  return data ?? [];
}

export async function getParentChildrenWithStatus(userId: string): Promise<ParentChildSummary[]> {
  if (!isUuid(userId)) {
    return [];
  }

  const links = await getGuardianLinksForUser(userId);

  if (!links.length) {
    return [];
  }

  const studentIds = links.map((link) => link.student_id);
  const [students, statuses] = await Promise.all([
    getGuardianPadronStudents(studentIds),
    fetchTodayStatuses(studentIds),
  ]);

  const statusByStudent = new Map(statuses.map((status) => [status.student_id, status]));
  const tripIds = [...new Set(statuses.map((status) => status.trip_id))];
  const trips = await fetchTripsByIds(tripIds);
  const tripMap = new Map(trips.map((trip) => [trip.id, trip]));

  const summaries = buildSummariesFromLinksAndStudents(
    links,
    students,
    statusByStudent,
    tripMap,
  );

  if (links.length > 0 && summaries.length === 0) {
    throw new Error(
      "Hay hijos vinculados, pero no aparecen en el padrón escolar. La municipalidad debe revisar bus_student_guardians y social_bus_escolar.",
    );
  }

  return summaries;
}
