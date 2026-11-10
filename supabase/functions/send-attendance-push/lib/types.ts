export type PushEventKey =
  | "recojo_subio"
  | "recojo_bajo"
  | "retorno_subio"
  | "retorno_bajo";

export type AttendanceEventType = "subio" | "bajo" | "ausente" | "manual";
export type TripDirection = "recojo" | "retorno";

export type AttendanceWebhookRecord = {
  id: string;
  trip_id: string;
  student_id: string;
  event_type: AttendanceEventType;
  scanned_at: string | null;
  voided_at: string | null;
};

export type ExpoPushTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
};
