import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/src/core/config/supabase";
import { getUser } from "@/src/features/auth/services/auth.service";
import {
  PARENT_CHILDREN_POLL_INTERVAL_MS,
  shouldRunForegroundPoll,
} from "@/src/features/parent/domain/parent-realtime-sync.rules";
import {
  parentChildrenStore,
  useParentChildrenStore,
} from "@/src/features/parent/store/parentChildrenStore";
import { useAppForeground } from "@/src/shared/hooks/useAppForeground";

const REALTIME_DEBOUNCE_MS = 450;

/**
 * Mantiene la caché de hijos sincronizada con Supabase Realtime.
 * Montar una sola vez en el layout de pestañas del padre (no en cada pantalla).
 */
export function useParentChildrenSync() {
  const store = useParentChildrenStore();
  const [realtimeStatus, setRealtimeStatus] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const userIdRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isForeground = useAppForeground();

  const scheduleSilentRefresh = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const userId = userIdRef.current;
      if (!userId) {
        return;
      }

      void parentChildrenStore.fetchChildren(userId, { silent: true, force: true });
    }, REALTIME_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    void (async () => {
      try {
        const user = await getUser();
        if (!user || !mountedRef.current) {
          return;
        }

        userIdRef.current = user.id;
        await parentChildrenStore.fetchChildren(user.id);
      } catch {
        // El store ya expone el mensaje de error.
      }
    })();

    return () => {
      mountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const studentIds = useMemo(
    () => store.children.map((child) => child.student.id),
    [store.children],
  );
  const studentIdsKey = studentIds.join(",");
  const shouldPoll = shouldRunForegroundPoll(realtimeStatus, isForeground);

  useEffect(() => {
    if (!shouldPoll || !studentIds.length || !userIdRef.current) {
      return;
    }

    const intervalId = setInterval(() => {
      void parentChildrenStore.fetchChildren(userIdRef.current!, { silent: true, force: true });
    }, PARENT_CHILDREN_POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [shouldPoll, studentIds.length, isForeground]);

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
        scheduleSilentRefresh,
      );

      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "buscontrol",
          table: "bus_attendance_records",
          filter: `student_id=eq.${studentId}`,
        },
        scheduleSilentRefresh,
      );

      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "buscontrol",
          table: "bus_attendance_records",
          filter: `student_id=eq.${studentId}`,
        },
        scheduleSilentRefresh,
      );
    }

    channel.subscribe((status) => {
      if (mountedRef.current) {
        setRealtimeStatus(status);
      }
    });

    return () => {
      setRealtimeStatus(null);
      void supabase.removeChannel(channel);
    };
  }, [studentIdsKey, scheduleSilentRefresh, studentIds]);
}

export function ParentChildrenSync() {
  useParentChildrenSync();
  return null;
}
