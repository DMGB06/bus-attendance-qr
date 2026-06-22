import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/src/core/config/supabase";
import { getChildTimelineToday } from "@/src/features/parent/services/child-timeline.service";
import { getParentChildrenWithStatus } from "@/src/features/parent/services/parent-children.service";
import type { ChildTimelineEvent, ParentChildSummary } from "@/src/features/parent/types";
import { getUser } from "@/src/features/auth/services/auth.service";

type ChildDetailState = {
  child: ParentChildSummary | null;
  timeline: ChildTimelineEvent[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useChildDetail(studentId: string | undefined): ChildDetailState {
  const [child, setChild] = useState<ParentChildSummary | null>(null);
  const [timeline, setTimeline] = useState<ChildTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const loadDetail = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!studentId) {
        setChild(null);
        setTimeline([]);
        setLoading(false);
        return;
      }

      const silent = options?.silent ?? false;

      if (!silent) {
        setLoading(true);
      }

      try {
        const user = await getUser();

        if (!user) {
          throw new Error("Debes iniciar sesión.");
        }

        const [children, nextTimeline] = await Promise.all([
          getParentChildrenWithStatus(user.id),
          getChildTimelineToday(studentId),
        ]);

        const matchedChild = children.find((item) => item.student.id === studentId) ?? null;

        if (!matchedChild) {
          throw new Error("No tienes acceso a este alumno.");
        }

        if (mountedRef.current) {
          setChild(matchedChild);
          setTimeline(nextTimeline);
          setError(null);
        }
      } catch (loadError) {
        if (mountedRef.current) {
          setError(loadError instanceof Error ? loadError.message : "Error al cargar el detalle.");
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [studentId],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadDetail({ silent: true });
  }, [loadDetail]);

  useEffect(() => {
    mountedRef.current = true;
    void loadDetail();

    return () => {
      mountedRef.current = false;
    };
  }, [loadDetail]);

  useEffect(() => {
    if (!studentId) {
      return;
    }

    const channel = supabase
      .channel(`parent-child-${studentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "buscontrol",
          table: "student_trip_status",
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          void loadDetail({ silent: true });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "buscontrol",
          table: "bus_attendance_records",
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          void loadDetail({ silent: true });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "buscontrol",
          table: "bus_attendance_records",
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          void loadDetail({ silent: true });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [studentId, loadDetail]);

  return {
    child,
    timeline,
    loading,
    refreshing,
    error,
    refresh,
  };
}
