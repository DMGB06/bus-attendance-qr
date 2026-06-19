import type { AttendanceEventType, TripDirection, TurnType } from "@/src/features/trips/types";

export type OperatorActivityRow = {
  recordId: string;
  tripId: string;
  tripDate: string;
  tripDirection: TripDirection;
  turnType: TurnType | null;
  tripStatus: string;
  studentId: string;
  studentName: string;
  eventType: AttendanceEventType;
  scannedAt: string | null;
  scannedBy: string | null;
  voidedAt: string | null;
  isOfflineSync: boolean;
};

export type ActivityTripGroup = {
  tripId: string;
  title: string;
  events: OperatorActivityRow[];
};

export type ActivityDayGroup = {
  date: string;
  dateLabel: string;
  trips: ActivityTripGroup[];
};

export type ActivityDayOption = {
  date: string;
  label: string;
  detailLabel: string;
};
