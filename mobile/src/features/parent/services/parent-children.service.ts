import { getGuardianPadronStudents } from "@/src/features/parent/services/guardian-students.service";
import { getChildrenTimelinesToday } from "@/src/features/parent/services/child-timeline.service";
import { getGuardianLinksForUser } from "@/src/features/parent/services/guardians.service";
import {
  fetchTripsForStatuses,
  resolveTodayStatusesForStudents,
} from "@/src/features/parent/services/parent-child-status.service";
import { resolveLinkedStudentPairs } from "@/src/features/parent/domain/parent-linked-students";
import { getTodayDateIso } from "@/src/features/parent/utils/date";
import { isUuid } from "@/src/shared/utils/uuid";
import type { ParentChildSummary, StudentTripStatus, ChildTimelineEvent } from "@/src/features/parent/types";
import type { Trip } from "@/src/features/trips/types";

function buildChildSummary(
  link: ParentChildSummary["link"],
  student: ParentChildSummary["student"],
  statusByStudent: Map<string, StudentTripStatus>,
  tripMap: Map<string, Trip>,
  todayTimeline: ChildTimelineEvent[],
): ParentChildSummary {
  const todayStatus =
    statusByStudent.get(student.id) ?? statusByStudent.get(link.student_id) ?? null;
  const activeTrip = todayStatus ? tripMap.get(todayStatus.trip_id) ?? null : null;

  return {
    link: { ...link, student_id: student.id },
    student,
    todayStatus,
    activeTrip,
    todayTimeline,
  };
}

export async function getParentChildrenWithStatus(userId: string): Promise<ParentChildSummary[]> {
  if (!isUuid(userId)) {
    return [];
  }

  const links = await getGuardianLinksForUser(userId);

  if (!links.length) {
    return [];
  }

  const linkStudentIds = links.map((link) => link.student_id);
  const students = await getGuardianPadronStudents(linkStudentIds);
  const pairs = resolveLinkedStudentPairs(links, students);

  if (!pairs.length) {
    if (links.length > 0) {
      throw new Error(
        "Hay hijos vinculados, pero no aparecen en el padrón escolar. La municipalidad debe revisar bus_student_guardians y social_bus_escolar.",
      );
    }
    return [];
  }

  const displayStudentIds = [...new Set(pairs.map((pair) => pair.student.id))];
  const today = getTodayDateIso();

  const [statuses, timelines] = await Promise.all([
    resolveTodayStatusesForStudents(displayStudentIds, today),
    getChildrenTimelinesToday(displayStudentIds),
  ]);

  const statusByStudent = new Map(statuses.map((status) => [status.student_id, status]));
  const trips = await fetchTripsForStatuses(statuses);
  const tripMap = new Map(trips.map((trip) => [trip.id, trip]));

  return pairs.map((pair) =>
    buildChildSummary(
      pair.link,
      pair.student,
      statusByStudent,
      tripMap,
      timelines.get(pair.student.id) ?? [],
    ),
  );
}
