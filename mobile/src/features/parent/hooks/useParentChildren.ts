import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/src/core/config/supabase";
import { getUser } from "@/src/features/auth/services/auth.service";
import { getParentChildrenWithStatus } from "@/src/features/parent/services/parent-children.service";
import type { ParentChildSummary } from "@/src/features/parent/types";

type ParentChildrenState = {
  children: ParentChildSummary[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useParentChildren(): ParentChildrenState {
  const [children, setChildren] = useState<ParentChildSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const loadChildren = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!silent) {
      setLoading(true);
    }

    try {
      const user = await getUser();

      if (!user) {
        throw new Error("Debes iniciar sesión.");
      }

      const nextChildren = await getParentChildrenWithStatus(user.id);

      if (mountedRef.current) {
        setChildren(nextChildren);
        setError(null);
      }
    } catch (loadError) {
      if (mountedRef.current) {
        setError(loadError instanceof Error ? loadError.message : "Error al cargar hijos.");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadChildren({ silent: true });
  }, [loadChildren]);

  const studentIds = useMemo(
    () => children.map((child) => child.student.id),
    [children],
  );

  useEffect(() => {
    mountedRef.current = true;
    void loadChildren();

    return () => {
      mountedRef.current = false;
    };
  }, [loadChildren]);

  useEffect(() => {
    if (!studentIds.length) {
      return;
    }

    const channel = supabase.channel(`parent-children-${studentIds.join("-")}`);

    for (const studentId of studentIds) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "buscontrol",
          table: "student_trip_status",
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          void loadChildren({ silent: true });
        },
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [studentIds, loadChildren]);

  return {
    children,
    loading,
    refreshing,
    error,
    refresh,
  };
}
