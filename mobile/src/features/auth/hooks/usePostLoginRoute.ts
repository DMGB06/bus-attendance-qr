import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { AUTH_ROUTES, OPS_ROUTES, PARENT_ROUTES, type PostLoginHref } from "@/src/core/routes";
import { resolvePostLoginHref } from "@/src/features/auth/services/post-login-route.service";

type PostLoginRouteState = {
  ready: boolean;
  href: PostLoginHref | null;
};

const PROFILE_ROUTE_TIMEOUT_MS = 4_000;

export function usePostLoginRoute(session: Session | null): PostLoginRouteState {
  const sessionUserId = session?.user?.id ?? null;
  const sessionUser = session?.user ?? null;
  const resolvedUserIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(!sessionUserId);
  const [href, setHref] = useState<PostLoginHref | null>(null);

  useEffect(() => {
    if (!sessionUserId) {
      resolvedUserIdRef.current = null;
      setHref(null);
      setReady(true);
      return;
    }

    if (resolvedUserIdRef.current === sessionUserId) {
      setReady(true);
      return;
    }

    let mounted = true;
    setHref(null);
    setReady(false);

    const finish = (nextHref: PostLoginHref) => {
      if (!mounted) {
        return;
      }
      resolvedUserIdRef.current = sessionUserId;
      setHref(nextHref);
      setReady(true);
    };

    const timeoutId = setTimeout(() => {
      if (!mounted || resolvedUserIdRef.current === sessionUserId) {
        return;
      }

      finish(OPS_ROUTES.trip);
    }, PROFILE_ROUTE_TIMEOUT_MS);

    void resolvePostLoginHref(sessionUserId, sessionUser)
      .then((nextHref) => {
        clearTimeout(timeoutId);
        finish(nextHref);
      })
      .catch(() => {
        clearTimeout(timeoutId);
        finish(OPS_ROUTES.trip);
      });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [sessionUserId]);

  return { ready, href };
}

export { AUTH_ROUTES, OPS_ROUTES, PARENT_ROUTES };
