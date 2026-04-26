// src/types/index.ts

export type TripDirection = "ida" | "vuelta";
export type TripStatus = "active" | "completed";
export type AttendanceEventType = "boarded" | "alighted" | "manual";

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
};

export type Trip = {
  id: string;
  direction: TripDirection;
  status: TripStatus;
  started_at: string;
  ended_at: string | null;
};

export type AttendanceRecord = {
  id: string;
  trip_id: string;
  student_id: string;
  event_type: AttendanceEventType;
  scanned_at: string;
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
        };
        Relationships: [];
      };
      bus_trips: {
        Row: Trip;
        Insert: {
          id?: string;
          direction: TripDirection;
          status?: TripStatus;
          started_at?: string;
          ended_at?: string | null;
        };
        Update: {
          id?: string;
          direction?: TripDirection;
          status?: TripStatus;
          started_at?: string;
          ended_at?: string | null;
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
          scanned_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          student_id?: string;
          event_type?: AttendanceEventType;
          scanned_at?: string;
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
