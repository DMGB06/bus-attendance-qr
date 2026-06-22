import { useCallback, useEffect, useState } from "react";

import {
  getCapabilitiesForRole,
  LOADING_CAPABILITIES,
  type AppCapabilities,
} from "@/src/features/auth/domain/permissions";
import { getUser } from "@/src/features/auth/services/auth.service";
import { getProfileById } from "@/src/features/profile/services/profile.service";
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
    const user = await getUser();
    if (!user) {
      setAppRole(null);
      setCapabilities(getCapabilitiesForRole(null));
      return;
    }

    const profile = await getProfileById(user.id);
    const role = profile?.app_role ?? null;
    setAppRole(role);
    setCapabilities(getCapabilitiesForRole(role));
  }, []);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
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
