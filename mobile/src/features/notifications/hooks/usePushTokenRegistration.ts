import { useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { useRouter } from "expo-router";

import { PARENT_ROUTES } from "@/src/core/routes";
import { getNotificationChildId } from "@/src/features/notifications/domain/notification-routing";
import { upsertPushToken } from "@/src/features/notifications/services/push-token.service";
import {
  getExpoPushToken,
  getPushPlatformLabel,
  hasPushPermission,
  isPushAvailable,
  requestPushPermissions,
  subscribeToNotificationTaps,
} from "@/src/features/notifications/services/push-permissions.service";
import { useAppForeground } from "@/src/shared/hooks/useAppForeground";
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
  const router = useRouter();
  const isForeground = useAppForeground();
  const promptedUserRef = useRef<string | null>(null);
  const registeredUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !userId) {
      promptedUserRef.current = null;
      registeredUserRef.current = null;
      return;
    }

    if (!isForeground || !isPushAvailable() || registeredUserRef.current === userId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        // Se pregunta una vez; despues solo se revisa si la activo en los ajustes del telefono.
        const alreadyPrompted = promptedUserRef.current === userId;
        promptedUserRef.current = userId;
        const granted = alreadyPrompted ? await hasPushPermission() : await requestPushPermissions();

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
        registeredUserRef.current = userId;
      } catch (error) {
        console.warn("[push] No se pudo registrar el token:", toSafeLogMessage(error));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, isForeground, userId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void subscribeToNotificationTaps((data) => {
      const childId = getNotificationChildId(data);
      if (childId) {
        router.push(PARENT_ROUTES.child(childId));
      }
    })
      .then((stop) => {
        if (cancelled) {
          stop();
        } else {
          unsubscribe = stop;
        }
      })
      .catch((error: unknown) => {
        console.warn("[push] No se pudo escuchar las notificaciones:", toSafeLogMessage(error));
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [enabled, router]);
}
