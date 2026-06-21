import type { SemanticColors } from "@/src/core/theme/semanticColors";
import type { AttendanceEventType } from "@/src/features/trips/types";

export function formatActivityEventTime(iso: string | null): string {
  if (!iso) {
    return "—";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStudentInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function getActivityEventColors(eventType: AttendanceEventType, colors: SemanticColors) {
  switch (eventType) {
    case "subio":
      return {
        stripe: colors.attendanceOnboard,
        tagBg: colors.primarySoftBg,
        tagText: colors.primarySoftText,
      };
    case "bajo":
      return {
        stripe: colors.attendanceCompleted,
        tagBg: "rgba(47, 133, 90, 0.12)",
        tagText: colors.attendanceCompleted,
      };
    case "ausente":
      return {
        stripe: colors.textMuted,
        tagBg: colors.surfaceTrack,
        tagText: colors.textMuted,
      };
    case "manual":
      return {
        stripe: colors.feedbackWarningBorder,
        tagBg: colors.feedbackWarningBg,
        tagText: colors.feedbackWarningTitle,
      };
    default:
      return {
        stripe: colors.borderMuted,
        tagBg: colors.surfaceTrack,
        tagText: colors.textMuted,
      };
  }
}

export function compareActivityEventsByTimeDesc(
  left: { scannedAt: string | null; recordId: string },
  right: { scannedAt: string | null; recordId: string },
): number {
  const leftTime = left.scannedAt ? new Date(left.scannedAt).getTime() : 0;
  const rightTime = right.scannedAt ? new Date(right.scannedAt).getTime() : 0;

  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return right.recordId.localeCompare(left.recordId);
}
