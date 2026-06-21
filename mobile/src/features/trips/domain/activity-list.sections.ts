import { groupEventsByStudent } from "@/src/features/trips/domain/activity-student-grouping";
import type {
  ActivityDayGroup,
  ActivityStudentGroup,
  OperatorActivityRow,
} from "@/src/features/trips/types/activity.types";

type ActivitySectionBase = {
  key: string;
  title: string;
  eventCount: number;
};

export type ActivityEventListSection = ActivitySectionBase & {
  mode: "event";
  data: OperatorActivityRow[];
};

export type ActivityStudentListSection = ActivitySectionBase & {
  mode: "student";
  studentCount: number;
  data: ActivityStudentGroup[];
};

export type ActivityListSection = ActivityEventListSection | ActivityStudentListSection;

export function buildActivityListSections(
  days: ActivityDayGroup[],
  options?: { includeDayInTitle?: boolean; groupByStudent?: boolean },
): ActivityListSection[] {
  const includeDayInTitle = options?.includeDayInTitle ?? false;
  const groupByStudent = options?.groupByStudent ?? false;
  const sections: ActivityListSection[] = [];

  for (const day of days) {
    for (const trip of day.trips) {
      if (trip.events.length === 0) {
        continue;
      }

      const title = includeDayInTitle ? `${day.dateLabel} · ${trip.title}` : trip.title;
      const key = `${day.date}-${trip.tripId}`;

      if (groupByStudent) {
        const studentGroups = groupEventsByStudent(trip.events).map((group) => ({
          ...group,
          listKey: `${key}:${group.studentId}`,
        }));
        sections.push({
          mode: "student",
          key,
          title,
          eventCount: trip.events.length,
          studentCount: studentGroups.length,
          data: studentGroups,
        });
        continue;
      }

      sections.push({
        mode: "event",
        key,
        title,
        eventCount: trip.events.length,
        data: trip.events,
      });
    }
  }

  return sections;
}

export function getActivityListSummary(days: ActivityDayGroup[]): {
  eventCount: number;
  tripCount: number;
  studentCount: number;
} {
  let eventCount = 0;
  let tripCount = 0;
  const studentIds = new Set<string>();

  for (const day of days) {
    for (const trip of day.trips) {
      if (trip.events.length === 0) {
        continue;
      }

      tripCount += 1;
      eventCount += trip.events.length;

      for (const event of trip.events) {
        studentIds.add(event.studentId);
      }
    }
  }

  return {
    eventCount,
    tripCount,
    studentCount: studentIds.size,
  };
}

export function isStudentActivitySection(
  section: ActivityListSection,
): section is ActivityStudentListSection {
  return section.mode === "student";
}

export function isEventActivitySection(
  section: ActivityListSection,
): section is ActivityEventListSection {
  return section.mode === "event";
}
