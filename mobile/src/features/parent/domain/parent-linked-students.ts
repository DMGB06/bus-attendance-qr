import type { ParentStudentLink, StudentTripStatus, StudentTripStatusValue } from "@/src/features/parent/types";
import type { Student } from "@/src/features/trips/types";

export type LinkedStudentPair = {
  link: ParentStudentLink;
  student: Student;
};

/** Empareja vínculos del apoderado con filas del padrón (mismo criterio que la UI). */
export function resolveLinkedStudentPairs(
  links: ParentStudentLink[],
  students: Student[],
): LinkedStudentPair[] {
  const studentMap = new Map(students.map((student) => [student.id, student]));

  const matched = links
    .map((link) => {
      const student = studentMap.get(link.student_id);
      if (!student) {
        return null;
      }
      return { link, student };
    })
    .filter((pair): pair is LinkedStudentPair => pair !== null);

  if (matched.length > 0) {
    return matched;
  }

  if (!students.length) {
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
      return { link, student };
    })
    .filter((pair): pair is LinkedStudentPair => pair !== null);
}

const STATUS_RANK: Record<StudentTripStatusValue, number> = {
  pending: 0,
  absent: 1,
  onboard: 2,
  returning: 3,
  at_school: 4,
  dropped_off: 4,
};

export function rankStudentTripStatus(status: StudentTripStatusValue): number {
  return STATUS_RANK[status] ?? 0;
}

export function pickPreferredStudentTripStatus(
  left: StudentTripStatus,
  right: StudentTripStatus,
): StudentTripStatus {
  return rankStudentTripStatus(left.status) >= rankStudentTripStatus(right.status) ? left : right;
}

type TripStatusSlice = { status: string };

/** Padre: viaje activo y evento más reciente ganan (tarde no queda tapada por recojo mañana). */
export function pickPreferredStudentTripStatusForParent(
  left: StudentTripStatus,
  right: StudentTripStatus,
  tripMap: Map<string, TripStatusSlice>,
): StudentTripStatus {
  const leftActive = tripMap.get(left.trip_id)?.status === "active";
  const rightActive = tripMap.get(right.trip_id)?.status === "active";

  if (leftActive !== rightActive) {
    return leftActive ? left : right;
  }

  const leftTime = left.last_event_at ?? left.updated_at;
  const rightTime = right.last_event_at ?? right.updated_at;

  if (leftTime && rightTime && leftTime !== rightTime) {
    return leftTime > rightTime ? left : right;
  }

  return pickPreferredStudentTripStatus(left, right);
}
