import {
  mapActivityEventLabelShort,
  mapActivityEventTagLabel,
} from "@/src/features/trips/domain/activity-event.labels";
import {
  compareActivityEventsByTimeDesc,
  formatActivityEventTime,
} from "@/src/features/trips/domain/activity-row.utils";
import type { ActivityStudentGroup, OperatorActivityRow } from "@/src/features/trips/types/activity.types";

export function groupEventsByStudent(events: OperatorActivityRow[]): ActivityStudentGroup[] {
  const groupsByStudent = new Map<string, ActivityStudentGroup>();

  for (const event of events) {
    const existing = groupsByStudent.get(event.studentId);

    if (existing) {
      existing.events.push(event);
      continue;
    }

    groupsByStudent.set(event.studentId, {
      studentId: event.studentId,
      studentName: event.studentName,
      events: [event],
      listKey: event.studentId,
    });
  }

  const groups = Array.from(groupsByStudent.values());

  for (const group of groups) {
    group.events.sort(compareActivityEventsByTimeDesc);
  }

  return groups.sort((left, right) =>
    left.studentName.localeCompare(right.studentName, "es", { sensitivity: "base" }),
  );
}

export function buildStudentActivitySummary(group: ActivityStudentGroup): string {
  const [latestEvent] = group.events;

  if (!latestEvent) {
    return "";
  }

  if (group.events.length === 1) {
    return `${mapActivityEventLabelShort(latestEvent.eventType, latestEvent.tripDirection)} · ${formatActivityEventTime(latestEvent.scannedAt)}`;
  }

  return group.events
    .map((event) => {
      const tag = mapActivityEventTagLabel(event.eventType, event.tripDirection);
      return `${tag} ${formatActivityEventTime(event.scannedAt)}`;
    })
    .join(" · ");
}
