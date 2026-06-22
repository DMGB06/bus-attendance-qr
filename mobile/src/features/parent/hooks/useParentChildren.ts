import { useCallback } from "react";

import { getUser } from "@/src/features/auth/services/auth.service";
import {
  parentChildrenStore,
  useParentChildrenStore,
} from "@/src/features/parent/store/parentChildrenStore";

type ParentChildrenState = {
  children: ReturnType<typeof useParentChildrenStore>["children"];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

/** Lee la caché compartida de hijos. La sincronización vive en `ParentChildrenSync`. */
export function useParentChildren(): ParentChildrenState {
  const store = useParentChildrenStore();

  const refresh = useCallback(async () => {
    const user = await getUser();
    if (!user) {
      throw new Error("Debes iniciar sesión.");
    }

    await parentChildrenStore.fetchChildren(user.id, { silent: true, force: true });
  }, []);

  return {
    children: store.children,
    loading: store.loading && store.children.length === 0,
    refreshing: store.refreshing,
    error: store.error,
    refresh,
  };
}
