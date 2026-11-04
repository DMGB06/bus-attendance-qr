import { supabase } from "@/src/core/config/supabase";
import { getPushEventLabel } from "@/src/features/notifications/domain/notification-templates";
import type { PushEventKey } from "@/src/features/notifications/types";
import { PUSH_EVENT_KEYS } from "@/src/features/notifications/types";

export type NotificationPreferenceItem = {
  eventKey: PushEventKey;
  label: string;
  isEnabled: boolean;
};

function defaultPreferences(): NotificationPreferenceItem[] {
  return PUSH_EVENT_KEYS.map((eventKey) => ({
    eventKey,
    label: getPushEventLabel(eventKey),
    isEnabled: true,
  }));
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferenceItem[]> {
  const { data, error } = await supabase
    .from("guardian_notification_preferences")
    .select("event_key, is_enabled")
    .eq("guardian_user_id", userId);

  if (error) {
    throw new Error("No se pudieron cargar las preferencias de notificaciones.");
  }

  const preferenceMap = new Map(
    (data ?? []).map((row) => [row.event_key as PushEventKey, row.is_enabled as boolean]),
  );

  return defaultPreferences().map((item) => ({
    ...item,
    isEnabled: preferenceMap.get(item.eventKey) ?? true,
  }));
}

export async function setNotificationPreferenceEnabled(
  userId: string,
  eventKey: PushEventKey,
  isEnabled: boolean,
): Promise<void> {
  const { error } = await supabase.from("guardian_notification_preferences").upsert(
    {
      guardian_user_id: userId,
      event_key: eventKey,
      is_enabled: isEnabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "guardian_user_id,event_key" },
  );

  if (error) {
    throw new Error("No se pudo guardar la preferencia de notificación.");
  }
}

