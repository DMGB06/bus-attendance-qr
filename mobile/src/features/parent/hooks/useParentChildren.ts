import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/src/core/config/supabase";
import { getUser } from "@/src/features/auth/services/auth.service";
import {
  PARENT_CHILDREN_POLL_INTERVAL_MS,
  shouldRunForegroundPoll,
} from "@/src/features/parent/domain/parent-realtime-sync.rules";
import { getParentChildrenWithStatus } from "@/src/features/parent/services/parent-children.service";
import type { ParentChildSummary } from "@/src/features/parent/types";
import { useAppForeground } from "@/src/shared/hooks/useAppForeground";

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
  const [realtimeStatus, setRealtimeStatus] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const isForeground = useAppForeground();

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
  const studentIdsKey = studentIds.join(",");

  const shouldPoll = shouldRunForegroundPoll(realtimeStatus, isForeground);

  useEffect(() => {
    mountedRef.current = true;
    void loadChildren();

    return () => {
      mountedRef.current = false;
    };
  }, [loadChildren]);

  useEffect(() => {
    if (!shouldPoll || !studentIds.length) {
      return;
    }

    const intervalId = setInterval(() => {
      void loadChildren({ silent: true });
    }, PARENT_CHILDREN_POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [loadChildren, shouldPoll, studentIds.length, isForeground]);

  useEffect(() => {
    if (!isForeground || realtimeStatus !== "SUBSCRIBED") {
      return;
    }

    void loadChildren({ silent: true });
  }, [isForeground, loadChildren, realtimeStatus]);

  useEffect(() => {
    if (!studentIds.length) {
      setRealtimeStatus(null);
      return;
    }

    const channel = supabase.channel(`parent-children-${studentIdsKey}`);

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

      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "buscontrol",
          table: "bus_attendance_records",
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          void loadChildren({ silent: true });
        },
      );

      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "buscontrol",
          table: "bus_attendance_records",
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          void loadChildren({ silent: true });
        },
      );
    }

    channel.subscribe((status) => {
      if (mountedRef.current) {
        setRealtimeStatus(status);
        if (status === "SUBSCRIBED") {
          void loadChildren({ silent: true });
        }
      }
    });

    return () => {
      setRealtimeStatus(null);
      void supabase.removeChannel(channel);
    };
  }, [studentIdsKey, loadChildren, studentIds]);

  return {
    children,
    loading,
    refreshing,
    error,
    refresh,
  };
}
