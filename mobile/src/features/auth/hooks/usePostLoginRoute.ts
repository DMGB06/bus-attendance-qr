import { useEffect, useState } from "react";

import { isParentRole } from "@/src/features/auth/domain/permissions";
import { getUser } from "@/src/features/auth/services/auth.service";
import { AUTH_ROUTES, OPS_ROUTES, PARENT_ROUTES } from "@/src/core/routes";
import { getProfileById } from "@/src/features/profile/services/profile.service";

type PostLoginRouteState = {
  ready: boolean;
  href: string | null;
};

export function usePostLoginRoute(session: unknown): PostLoginRouteState {
  const [ready, setReady] = useState(!session);
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setHref(null);
      setReady(true);
      return;
    }

    let mounted = true;
    setReady(false);

    void (async () => {
      try {
        const user = await getUser();
        const profile = user ? await getProfileById(user.id) : null;
        const nextHref = isParentRole(profile?.app_role)
          ? PARENT_ROUTES.home
          : OPS_ROUTES.trip;

        if (mounted) {
          setHref(nextHref);
        }
      } catch {
        if (mounted) {
          setHref(OPS_ROUTES.trip);
        }
      } finally {
        if (mounted) {
          setReady(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [session]);

  return { ready, href };
}

export { AUTH_ROUTES, OPS_ROUTES, PARENT_ROUTES };
