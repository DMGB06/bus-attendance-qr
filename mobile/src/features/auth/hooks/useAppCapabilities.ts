import { getSession } from "@/src/features/auth/services/auth.service";
import { useCallback, useEffect, useState } from "react";

import {
  getCapabilitiesForRole,
  getEffectiveRole,
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
    const session = await getSession();
    const user = session?.user;

    if (!user) {
      setAppRole(null);
      setCapabilities(getCapabilitiesForRole(null));
      return;
    }

    const profile = await getProfileById(user.id, user);
    const role = getEffectiveRole(profile);
    setAppRole(role);
    setCapabilities(getCapabilitiesForRole(role));
  }, []);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const session = await getSession();
        const userEmail = session?.user?.email ?? "";
        const memoryProfile = userEmail ? getMemoryCachedProfile(userEmail) : null;

        if (memoryProfile && mounted) {
          const memoryRole = getEffectiveRole(memoryProfile);
          setAppRole(memoryRole);
          setCapabilities(getCapabilitiesForRole(memoryRole));
          setLoading(false);
        }

        await refresh();
      } catch {
        // Sin red ni perfil guardado: siguen los permisos neutros.
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
