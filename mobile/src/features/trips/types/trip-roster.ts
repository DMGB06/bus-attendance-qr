import type { AttendanceRecord, Student } from "@/src/features/trips/types";

export type TripRosterStatus = "pending" | "onboard" | "completed";

export type TripRosterItem = {
  student: Student;
  attendance: AttendanceRecord | null;
  status: TripRosterStatus;
  hasAttendance: boolean;
  canMarkManual: boolean;
  canMarkExit: boolean;
  isPendingSync: boolean;
  pendingScannedBy: string | null;
};
