import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/src/core/config/supabase";
import { getUser } from "@/src/features/auth/services/auth.service";
import { getChildTimelineToday } from "@/src/features/parent/services/child-timeline.service";
import {
  parentChildrenStore,
  useParentChildrenStore,
} from "@/src/features/parent/store/parentChildrenStore";
import type { ChildTimelineEvent, ParentChildSummary } from "@/src/features/parent/types";

const REALTIME_DEBOUNCE_MS = 450;

type ChildDetailState = {
  child: ParentChildSummary | null;
  timeline: ChildTimelineEvent[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useChildDetail(studentId: string | undefined): ChildDetailState {
  const store = useParentChildrenStore();
  const cachedChild = studentId ? parentChildrenStore.getChildById(studentId) : null;
  const [child, setChild] = useState<ParentChildSummary | null>(cachedChild);
  const [timeline, setTimeline] = useState<ChildTimelineEvent[]>(
    cachedChild?.todayTimeline ?? [],
  );
  const [loading, setLoading] = useState(!cachedChild);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTimeline = useCallback(async (options?: { silent?: boolean }) => {
    if (!studentId) {
      setChild(null);
      setTimeline([]);
      setLoading(false);
      return;
    }

    const silent = options?.silent ?? false;
    if (!silent && !parentChildrenStore.getChildById(studentId)) {
      setLoading(true);
    }

    try {
      const nextTimeline = await getChildTimelineToday(studentId);
      const matchedChild = parentChildrenStore.getChildById(studentId);

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
  }, [studentId]);

  const refresh = useCallback(async () => {
    if (!studentId) {
      return;
    }

    setRefreshing(true);

    const userId = store.userId;
    if (userId) {
      await parentChildrenStore.fetchChildren(userId, { silent: true, force: true });
    }

    await loadTimeline({ silent: true });
  }, [loadTimeline, studentId, store.userId]);

  useEffect(() => {
    mountedRef.current = true;

    void (async () => {
      if (!studentId) {
        setChild(null);
        setTimeline([]);
        setLoading(false);
        return;
      }

      let matchedChild = parentChildrenStore.getChildById(studentId);
      if (!matchedChild) {
        try {
          const user = await getUser();
          if (user) {
            await parentChildrenStore.fetchChildren(user.id);
            matchedChild = parentChildrenStore.getChildById(studentId);
          }
        } catch {
          // loadTimeline reportará el error.
        }
      }

      if (matchedChild && mountedRef.current) {
        setChild(matchedChild);
        setTimeline(matchedChild.todayTimeline);
        setLoading(false);
      }

      await loadTimeline({ silent: Boolean(matchedChild) });
    })();

    return () => {
      mountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [loadTimeline, studentId]);

  useEffect(() => {
    if (!studentId) {
      return;
    }

    const cached = parentChildrenStore.getChildById(studentId);
    if (cached) {
      setChild(cached);
      if (!loading) {
        setTimeline(cached.todayTimeline);
      }
    }
  }, [store.children, studentId, loading]);

  useEffect(() => {
    if (!studentId) {
      return;
    }

    const scheduleRefresh = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        void refresh();
      }, REALTIME_DEBOUNCE_MS);
    };

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
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "buscontrol",
          table: "bus_attendance_records",
          filter: `student_id=eq.${studentId}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "buscontrol",
          table: "bus_attendance_records",
          filter: `student_id=eq.${studentId}`,
        },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [studentId, refresh]);

  return {
    child,
    timeline,
    loading: loading && !child,
    refreshing,
    error,
    refresh,
  };
}
