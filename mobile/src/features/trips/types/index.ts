// src/features/trips/types/index.ts

export type TripDirection = "recojo" | "retorno";
/** Valores reales en Postgres (constraint en inglés). */
export type TripStatus = "active" | "completed";
export type TurnType = "mañana" | "tarde";
export type AttendanceEventType = "subio" | "bajo" | "ausente" | "manual";

export type Student = {
  id: string;
  nombre_alumno: string;
  dni_alumno: string;
  edad: number | null;
  sexo: string | null;
  colegio: string | null;
  nombre_apoderado: string | null;
  telefono_apoderado: string | null;
  dni_apoderado: string | null;
  direccion: string | null;
  usuario_registro: string | null;
  created_at: string;
  codigo: string | null;
  foto_url: string | null;
  activo: boolean | null;
  notas: string | null;
};

export type Trip = {
  id: string;
  direction: TripDirection;
  status: TripStatus;
  started_at: string | null;
  ended_at: string | null;
  operator_id: string | null;
  trip_date: string;
  turn_type: TurnType | null;
};

export type AttendanceRecord = {
  id: string;
  trip_id: string;
  student_id: string;
  event_type: AttendanceEventType;
  scanned_at: string | null;
  lat: number | null;
  lng: number | null;
  operator_id: string | null;
  is_offline_sync: boolean | null;
};

export type Database = {
  public: {
    Tables: {
      social_bus_escolar: {
        Row: Student;
        Insert: {
          id?: string;
          nombre_alumno: string;
          dni_alumno: string;
          edad?: number | null;
          sexo?: string | null;
          colegio?: string | null;
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
        };
        Update: {
          id?: string;
          nombre_alumno?: string;
          dni_alumno?: string;
          edad?: number | null;
          sexo?: string | null;
          colegio?: string | null;
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
        };
        Relationships: [];
      };
      bus_trips: {
        Row: Trip;
        Insert: {
          id?: string;
          direction: TripDirection;
          status?: TripStatus;
          started_at?: string | null;
          ended_at?: string | null;
          operator_id?: string | null;
          trip_date?: string;
          turn_type?: TurnType | null;
        };
        Update: {
          id?: string;
          direction?: TripDirection;
          status?: TripStatus;
          started_at?: string | null;
          ended_at?: string | null;
          operator_id?: string | null;
          trip_date?: string;
          turn_type?: TurnType | null;
        };
        Relationships: [];
      };
      bus_attendance_records: {
        Row: AttendanceRecord;
        Insert: {
          id?: string;
          trip_id: string;
          student_id: string;
          event_type: AttendanceEventType;
          scanned_at?: string | null;
          lat?: number | null;
          lng?: number | null;
          operator_id?: string | null;
          is_offline_sync?: boolean | null;
        };
        Update: {
          id?: string;
          trip_id?: string;
          student_id?: string;
          event_type?: AttendanceEventType;
          scanned_at?: string | null;
          lat?: number | null;
          lng?: number | null;
          operator_id?: string | null;
          is_offline_sync?: boolean | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
