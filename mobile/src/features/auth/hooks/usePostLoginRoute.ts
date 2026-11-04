import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { AUTH_ROUTES, OPS_ROUTES, PARENT_ROUTES, type PostLoginHref } from "@/src/core/routes";
import {
  resolveCachedPostLoginHref,
  resolvePostLoginHref,
} from "@/src/features/auth/services/post-login-route.service";

export type RouteBlockReason = "offline" | "no_access";

type PostLoginRouteState = {
  ready: boolean;
  href: PostLoginHref | null;
  blockReason: RouteBlockReason | null;
  retry: () => void;
};

const PROFILE_ROUTE_TIMEOUT_MS = 4_000;

export function usePostLoginRoute(session: Session | null): PostLoginRouteState {
  const sessionUserId = session?.user?.id ?? null;
  const sessionUser = session?.user ?? null;
  const sessionUserRef = useRef(sessionUser);
  sessionUserRef.current = sessionUser;
  const resolvedUserIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(!sessionUserId);
  const [href, setHref] = useState<PostLoginHref | null>(null);
  const [blockReason, setBlockReason] = useState<RouteBlockReason | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!sessionUserId) {
      resolvedUserIdRef.current = null;
      setHref(null);
      setBlockReason(null);
      setReady(true);
      return;
    }

    if (resolvedUserIdRef.current === sessionUserId) {
      setReady(true);
      return;
    }

    let mounted = true;
    setHref(null);
    setBlockReason(null);
    setReady(false);

    const finish = (nextHref: PostLoginHref) => {
      if (!mounted) {
        return;
      }
      resolvedUserIdRef.current = sessionUserId;
      setHref(nextHref);
      setBlockReason(null);
      setReady(true);
    };

    const block = (reason: RouteBlockReason) => {
      if (!mounted) {
        return;
      }
      setBlockReason(reason);
      setReady(true);
    };

    const applyCachedRouteOrBlock = async () => {
      const cachedHref = await resolveCachedPostLoginHref(sessionUserRef.current).catch(() => null);
      if (cachedHref) {
        finish(cachedHref);
      } else if (resolvedUserIdRef.current !== sessionUserId) {
        block("offline");
      }
    };

    // Red lenta: se entra con el rol guardado; si la respuesta llega despues, la corrige.
    const timeoutId = setTimeout(() => {
      void applyCachedRouteOrBlock();
    }, PROFILE_ROUTE_TIMEOUT_MS);

    void resolvePostLoginHref(sessionUserId, sessionUserRef.current)
      .then((nextHref) => {
        clearTimeout(timeoutId);
        if (nextHref) {
          finish(nextHref);
          return;
        }
        // El servidor manda: revoca tambien lo que se abrio con el rol guardado.
        if (mounted) {
          resolvedUserIdRef.current = null;
          setHref(null);
        }
        block("no_access");
      })
      .catch(() => {
        clearTimeout(timeoutId);
        void applyCachedRouteOrBlock();
      });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [sessionUserId, attempt]);

  return { ready, href, blockReason, retry };
}

export { AUTH_ROUTES, OPS_ROUTES, PARENT_ROUTES };
