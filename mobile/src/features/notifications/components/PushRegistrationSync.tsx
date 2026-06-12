import type { Session } from "@supabase/supabase-js";

import { usePushTokenRegistration } from "@/src/features/notifications/hooks/usePushTokenRegistration";

type PushRegistrationSyncProps = {
  session: Session | null;
  postLoginHref: string | null;
};

/**
 * Registra el token Expo Push para apoderados tras login.
 * Montar una sola vez en el root layout.
 */
export function PushRegistrationSync({ session, postLoginHref }: PushRegistrationSyncProps) {
  const enabled = Boolean(session && postLoginHref?.startsWith("/(parent)"));

  usePushTokenRegistration({ session, enabled });

  return null;
}
