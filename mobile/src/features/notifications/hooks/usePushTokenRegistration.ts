import { useEffect } from "react";
import type { Session } from "@supabase/supabase-js";

import { upsertPushToken } from "@/src/features/notifications/services/push-token.service";
import {
  getExpoPushToken,
  getPushPlatformLabel,
  isPushAvailable,
  requestPushPermissions,
} from "@/src/features/notifications/services/push-permissions.service";
import { toSafeLogMessage } from "@/src/shared/utils/safe-log";

type UsePushTokenRegistrationOptions = {
  session: Session | null;
  enabled: boolean;
};

export function usePushTokenRegistration({
  session,
  enabled,
}: UsePushTokenRegistrationOptions): void {
  const userId = session?.user.id;

  useEffect(() => {
    if (!enabled || !userId || !isPushAvailable()) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const granted = await requestPushPermissions();

        if (!granted || cancelled) {
          return;
        }

        const token = await getExpoPushToken();

        if (!token || cancelled) {
          return;
        }

        await upsertPushToken({
          userId,
          expoPushToken: token,
          platform: getPushPlatformLabel(),
        });
      } catch (error) {
        console.warn("[push] No se pudo registrar el token:", toSafeLogMessage(error));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);
}
