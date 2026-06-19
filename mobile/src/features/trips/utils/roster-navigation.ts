import type { RosterViewMode } from "@/src/features/trips/hooks/useTripRoster";

let pendingRosterView: RosterViewMode | null = null;

export function requestRosterView(view: RosterViewMode): void {
  pendingRosterView = view;
}

export function consumePendingRosterView(): RosterViewMode | null {
  const view = pendingRosterView;
  pendingRosterView = null;
  return view;
}
