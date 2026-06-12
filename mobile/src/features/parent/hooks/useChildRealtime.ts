import { useEffect } from "react";

import { supabase } from "@/src/core/config/supabase";

/**
 * Suscripción Realtime a `student_trip_status` para uno o más hijos.
 * Útil cuando el hook de datos no incluye ya la suscripción.
 */
export function useChildRealtime(studentIds: string[], onUpdate: () => void): void {
  const studentKey = studentIds.join(",");

  useEffect(() => {
    if (!studentIds.length) {
      return;
    }

    const channel = supabase.channel(`parent-realtime-${studentKey}`);

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
          onUpdate();
        },
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [studentKey, onUpdate, studentIds]);
}
