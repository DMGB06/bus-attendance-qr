// src/features/trips/types/index.ts

export type TripDirection = "recojo" | "retorno";
/** Valores reales en Postgres (constraint en inglés). */
export type TripStatus = "active" | "completed";
export type TurnType = "mañana" | "tarde_primaria" | "tarde_secundaria" | "tarde_unica" | "tarde";
export type AttendanceEventType = "subio" | "bajo" | "ausente" | "manual";

export type NivelEducativo = "primaria" | "secundaria";

export type Student = {
  id: string;
  nombre_alumno: string;
  dni_alumno: string;
  edad: number | null;
  sexo: string | null;
  colegio: string | null;
  nivel_educativo: NivelEducativo | null;
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
  bus_id: string | null;
  started_by: string | null;
  assistant_id: string | null;
  last_lat: number | null;
  last_lng: number | null;
  last_location_at: string | null;
};

export type TripLocationPoint = {
  id: string;
  trip_id: string;
  lat: number;
  lng: number;
  recorded_at: string;
  recorded_by: string | null;
};

export type CrewRole = "chofer" | "asistenta";

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
  scanned_by: string | null;
  scan_role: CrewRole | null;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
};
