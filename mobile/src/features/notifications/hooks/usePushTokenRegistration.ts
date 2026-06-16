import { useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";

import {
  deactivatePushTokensForUser,
  upsertPushToken,
} from "@/src/features/notifications/services/push-token.service";
import {
  getExpoPushToken,
  getPushPlatformLabel,
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
  const registeredForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !userId) {
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

        registeredForUserRef.current = userId;
      } catch (error) {
        console.warn("[push] No se pudo registrar el token:", toSafeLogMessage(error));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);

  useEffect(() => {
    if (session || !registeredForUserRef.current) {
      return;
    }

    const previousUserId = registeredForUserRef.current;
    registeredForUserRef.current = null;

    void deactivatePushTokensForUser(previousUserId).catch((error) => {
      console.warn(
        "[push] No se pudo desactivar el token al cerrar sesión:",
        toSafeLogMessage(error),
      );
    });
  }, [session]);
}
