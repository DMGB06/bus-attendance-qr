import type {
  AttendanceEventType,
  Student,
  Trip,
  TripDirection,
  TurnType,
} from "@/src/features/trips/types";

export type StudentTripStatusValue =
  | "pending"
  | "absent"
  | "onboard"
  | "at_school"
  | "returning"
  | "dropped_off";

export type StudentGuardian = {
  id: string;
  student_id: string;
  guardian_user_id: string;
  relationship: string;
  is_primary: boolean;
  verified_at: string | null;
  created_at: string;
};

/** Catálogo municipal de apoderados (tabla bus_guardians). */
export type BusGuardian = {
  id: string;
  full_name: string;
  phone: string | null;
  phone_normalized: string | null;
  dni: string | null;
  email: string | null;
  auth_user_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** Vínculo alumno ↔ apoderado del catálogo (tabla bus_student_guardians). */
export type BusStudentGuardianLink = {
  id: string;
  student_id: string;
  guardian_id: string;
  relationship: string;
  is_primary: boolean;
  created_at: string;
};

/** Vínculo normalizado que usa la app (desde catálogo o student_guardians). */
export type ParentStudentLink = {
  id: string;
  student_id: string;
  relationship: string;
  is_primary: boolean;
  created_at: string;
  source: "bus_student_guardians" | "student_guardians";
};

export type StudentTripStatus = {
  student_id: string;
  trip_id: string;
  trip_date: string;
  direction: TripDirection;
  status: StudentTripStatusValue;
  last_event_type: string | null;
  last_event_at: string | null;
  updated_at: string;
};

export type ParentChildSummary = {
  link: ParentStudentLink;
  student: Student;
  todayStatus: StudentTripStatus | null;
  activeTrip: Trip | null;
};

export type ChildTimelineEvent = {
  id: string;
  event_type: AttendanceEventType;
  scanned_at: string | null;
  trip_id: string;
  trip_direction: TripDirection;
  turn_type: TurnType | null;
  voided_at: string | null;
};

export type ParentStatusTone = "pending" | "onboard" | "completed" | "absent" | "neutral";

export type ParentStatusPresentation = {
  label: string;
  subtitle: string;
  tone: ParentStatusTone;
  icon: string;
};
