import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/src/core/config/supabase";
import {
  getCapabilitiesForRole,
  LOADING_CAPABILITIES,
  type AppCapabilities,
} from "@/src/features/auth/domain/permissions";
import { getProfileById } from "@/src/features/profile/services/profile.service";
import { getMemoryCachedProfile } from "@/src/features/profile/storage/profile-cache.storage";
import { AppRole } from "@/src/features/profile/types";

type AppCapabilitiesState = {
  capabilities: AppCapabilities;
  appRole: AppRole | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

export function useAppCapabilities(): AppCapabilitiesState {
  const [capabilities, setCapabilities] = useState<AppCapabilities>(() => LOADING_CAPABILITIES);
  const [appRole, setAppRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      setAppRole(null);
      setCapabilities(getCapabilitiesForRole(null));
      return;
    }

    const userEmail = user.email ?? "";
    const memoryProfile = userEmail ? getMemoryCachedProfile(userEmail) : null;
    if (memoryProfile) {
      setAppRole(memoryProfile.app_role ?? null);
      setCapabilities(getCapabilitiesForRole(memoryProfile.app_role ?? null));
      return;
    }

    const profile = await getProfileById(user.id, user);
    const role = profile?.app_role ?? null;
    setAppRole(role);
    setCapabilities(getCapabilitiesForRole(role));
  }, []);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userEmail = session?.user?.email ?? "";
        const memoryProfile = userEmail ? getMemoryCachedProfile(userEmail) : null;

        if (memoryProfile && mounted) {
          setAppRole(memoryProfile.app_role ?? null);
          setCapabilities(getCapabilitiesForRole(memoryProfile.app_role ?? null));
          setLoading(false);
        }

        await refresh();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [refresh]);

  return { capabilities, appRole, loading, refresh };
}
