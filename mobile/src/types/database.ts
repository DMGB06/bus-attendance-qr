import type {
  Student,
  TripDirection,
  Trip,
  AttendanceRecord,
  TripStatus,
  TurnType,
  AttendanceEventType,
  NivelEducativo,
  TripLocationPoint,
} from "@/src/features/trips/types";

import type { AppProfile, AppRole, UpdateAppProfile } from "@/src/features/profile/types";
import type {
  BusGuardian,
  BusStudentGuardianLink,
  StudentGuardian,
  StudentTripStatus,
} from "@/src/features/parent/types";
import type {
  DevicePushToken,
  GuardianNotificationPreference,
  NotificationLogEntry,
} from "@/src/features/notifications/types";

type TableDef<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  buscontrol: {
    Tables: {
      app_profiles: TableDef<AppProfile, AppProfile, UpdateAppProfile>;
      bus_trips: TableDef<
        Trip,
        {
          id?: string;
          direction: TripDirection;
          status?: TripStatus;
          started_at?: string | null;
          ended_at?: string | null;
          operator_id?: string | null;
          trip_date?: string;
          turn_type?: TurnType | null;
          bus_id?: string | null;
          started_by?: string | null;
          assistant_id?: string | null;
          last_lat?: number | null;
          last_lng?: number | null;
          last_location_at?: string | null;
        },
        {
          id?: string;
          direction?: TripDirection;
          status?: TripStatus;
          started_at?: string | null;
          ended_at?: string | null;
          operator_id?: string | null;
          trip_date?: string;
          turn_type?: TurnType | null;
          bus_id?: string | null;
          started_by?: string | null;
          assistant_id?: string | null;
          last_lat?: number | null;
          last_lng?: number | null;
          last_location_at?: string | null;
        }
      >;
      bus_trip_locations: TableDef<
        TripLocationPoint,
        {
          id?: string;
          trip_id: string;
          lat: number;
          lng: number;
          recorded_at?: string;
          recorded_by?: string | null;
        },
        {
          lat?: number;
          lng?: number;
          recorded_at?: string;
          recorded_by?: string | null;
        }
      >;
      bus_attendance_records: TableDef<
        AttendanceRecord,
        {
          id?: string;
          trip_id: string;
          student_id: string;
          event_type: AttendanceEventType;
          scanned_at?: string | null;
          lat?: number | null;
          lng?: number | null;
          operator_id?: string | null;
          is_offline_sync?: boolean | null;
          scanned_by?: string | null;
          scan_role?: "chofer" | "asistenta" | null;
          voided_at?: string | null;
          voided_by?: string | null;
          void_reason?: string | null;
        },
        {
          id?: string;
          trip_id?: string;
          student_id?: string;
          event_type?: AttendanceEventType;
          scanned_at?: string | null;
          lat?: number | null;
          lng?: number | null;
          operator_id?: string | null;
          is_offline_sync?: boolean | null;
          scanned_by?: string | null;
          scan_role?: "chofer" | "asistenta" | null;
          voided_at?: string | null;
          voided_by?: string | null;
          void_reason?: string | null;
        }
      >;
      bus_units: TableDef<{
        id: string;
        code: string;
        plate: string | null;
        label: string;
        is_active: boolean;
      }>;
      bus_crew_assignments: TableDef<{
        id: string;
        bus_id: string;
        user_id: string;
        crew_role: "chofer" | "asistenta";
        assignment_date: string;
        is_active: boolean;
      }>;
      student_guardians: TableDef<
        StudentGuardian,
        {
          id?: string;
          student_id: string;
          guardian_user_id: string;
          relationship?: string;
          is_primary?: boolean;
          verified_at?: string | null;
          created_at?: string;
        },
        {
          relationship?: string;
          is_primary?: boolean;
          verified_at?: string | null;
        }
      >;
      bus_guardians: TableDef<
        BusGuardian,
        {
          id?: string;
          full_name: string;
          phone?: string | null;
          phone_normalized?: string | null;
          dni?: string | null;
          email?: string | null;
          auth_user_id?: string | null;
          is_active?: boolean;
          notes?: string | null;
        },
        {
          full_name?: string;
          phone?: string | null;
          phone_normalized?: string | null;
          dni?: string | null;
          email?: string | null;
          auth_user_id?: string | null;
          is_active?: boolean;
          notes?: string | null;
          updated_at?: string;
        }
      >;
      bus_student_guardians: TableDef<
        BusStudentGuardianLink,
        {
          id?: string;
          student_id: string;
          guardian_id: string;
          relationship?: string;
          is_primary?: boolean;
        },
        {
          relationship?: string;
          is_primary?: boolean;
        }
      >;
      student_trip_status: TableDef<
        StudentTripStatus,
        {
          student_id: string;
          trip_id: string;
          trip_date: string;
          direction: TripDirection;
          status: StudentTripStatus["status"];
          last_event_type?: string | null;
          last_event_at?: string | null;
          updated_at?: string;
        },
        {
          status?: StudentTripStatus["status"];
          last_event_type?: string | null;
          last_event_at?: string | null;
          updated_at?: string;
        }
      >;
      device_push_tokens: TableDef<
        DevicePushToken,
        {
          id?: string;
          user_id: string;
          expo_push_token: string;
          platform?: string | null;
          is_active?: boolean;
          updated_at?: string;
        },
        {
          platform?: string | null;
          is_active?: boolean;
          updated_at?: string;
        }
      >;
      notification_log: TableDef<
        NotificationLogEntry,
        {
          id?: string;
          guardian_user_id: string;
          student_id: string;
          event_key: string;
          title: string;
          body: string;
          delivery_status?: NotificationLogEntry["delivery_status"];
          created_at?: string;
        },
        {
          delivery_status?: NotificationLogEntry["delivery_status"];
        }
      >;
      guardian_notification_preferences: TableDef<
        GuardianNotificationPreference,
        {
          guardian_user_id: string;
          event_key: GuardianNotificationPreference["event_key"];
          is_enabled?: boolean;
          updated_at?: string;
        },
        {
          is_enabled?: boolean;
          updated_at?: string;
        }
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      get_own_profile: {
        Args: Record<PropertyKey, never>;
        Returns: AppProfile;
      };
      current_app_role: {
        Args: Record<PropertyKey, never>;
        Returns: AppRole;
      };
      update_own_profile: {
        Args: { p_full_name?: string | null; p_phone?: string | null };
        Returns: AppProfile;
      };
      void_attendance_record: {
        Args: { p_record_id: string; p_reason: string };
        Returns: AttendanceRecord;
      };
      get_operator_activity_range: {
        Args: { p_start_date: string; p_end_date: string };
        Returns: {
          record_id: string;
          trip_id: string;
          trip_date: string;
          trip_direction: string;
          turn_type: string | null;
          trip_status: string;
          student_id: string;
          student_name: string;
          event_type: string;
          scanned_at: string | null;
          scanned_by: string | null;
          voided_at: string | null;
          is_offline_sync: boolean;
        }[];
      };
    };
    Enums: {
      app_role: AppRole;
    };
    CompositeTypes: { [_ in never]: never };
  };
  public: {
    Tables: {
      social_bus_escolar: TableDef<
        Student,
        {
          id?: string;
          nombre_alumno: string;
          dni_alumno: string;
          edad?: number | null;
          sexo?: string | null;
          colegio?: string | null;
          nivel_educativo?: NivelEducativo | null;
          nombre_apoderado?: string | null;
          telefono_apoderado?: string | null;
          dni_apoderado?: string | null;
          direccion?: string | null;
          usuario_registro?: string | null;
          created_at?: string;
          codigo?: string | null;
          foto_url?: string | null;
          activo?: boolean | null;
          notas?: string | null;
        },
        {
          id?: string;
          nombre_alumno?: string;
          dni_alumno?: string;
          edad?: number | null;
          sexo?: string | null;
          colegio?: string | null;
          nivel_educativo?: NivelEducativo | null;
          nombre_apoderado?: string | null;
          telefono_apoderado?: string | null;
          dni_apoderado?: string | null;
          direccion?: string | null;
          usuario_registro?: string | null;
          created_at?: string;
          codigo?: string | null;
          foto_url?: string | null;
          activo?: boolean | null;
          notas?: string | null;
        }
      >;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
