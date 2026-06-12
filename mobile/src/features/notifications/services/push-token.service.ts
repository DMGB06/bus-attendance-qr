import { supabase } from "@/src/core/config/supabase";
import type { DevicePushToken } from "@/src/features/notifications/types";

type UpsertPushTokenInput = {
  userId: string;
  expoPushToken: string;
  platform: string;
};

export async function upsertPushToken({
  userId,
  expoPushToken,
  platform,
}: UpsertPushTokenInput): Promise<DevicePushToken> {
  const { data, error } = await supabase
    .from("device_push_tokens")
    .upsert(
      {
        user_id: userId,
        expo_push_token: expoPushToken,
        platform,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,expo_push_token" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error("No se pudo registrar el token de notificaciones.");
  }

  return data as DevicePushToken;
}

export async function deactivatePushTokensForUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from("device_push_tokens")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw new Error("No se pudo desactivar el token de notificaciones.");
  }
}
