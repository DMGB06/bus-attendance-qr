export type PushEventKey =
  | "recojo_subio"
  | "recojo_bajo"
  | "retorno_subio"
  | "retorno_bajo";

export type NotificationDeliveryStatus = "pending" | "sent" | "failed" | "skipped";

export type DevicePushToken = {
  id: string;
  user_id: string;
  expo_push_token: string;
  platform: string | null;
  is_active: boolean;
  updated_at: string;
};

export type NotificationLogEntry = {
  id: string;
  guardian_user_id: string;
  student_id: string;
  event_key: string;
  title: string;
  body: string;
  delivery_status: NotificationDeliveryStatus;
  created_at: string;
};

export type GuardianNotificationPreference = {
  guardian_user_id: string;
  event_key: PushEventKey;
  is_enabled: boolean;
  updated_at: string;
};

export const PUSH_EVENT_KEYS: PushEventKey[] = [
  "recojo_subio",
  "recojo_bajo",
  "retorno_subio",
  "retorno_bajo",
];
