import { useCallback, useEffect, useState } from "react";

import { getUser } from "@/src/features/auth/services/auth.service";
import {
  getNotificationPreferences,
  setNotificationPreferenceEnabled,
  type NotificationPreferenceItem,
} from "@/src/features/notifications/services/notification-preferences.service";
import type { PushEventKey } from "@/src/features/notifications/types";

type NotificationPreferencesState = {
  items: NotificationPreferenceItem[];
  loading: boolean;
  savingKey: PushEventKey | null;
  error: string | null;
  togglePreference: (eventKey: PushEventKey, isEnabled: boolean) => Promise<void>;
  refresh: () => Promise<void>;
};

export function useNotificationPreferences(): NotificationPreferencesState {
  const [items, setItems] = useState<NotificationPreferenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<PushEventKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    setLoading(true);

    try {
      const user = await getUser();

      if (!user) {
        throw new Error("Debes iniciar sesión.");
      }

      const nextItems = await getNotificationPreferences(user.id);
      setItems(nextItems);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar las preferencias.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const togglePreference = useCallback(async (eventKey: PushEventKey, isEnabled: boolean) => {
    setSavingKey(eventKey);

    try {
      const user = await getUser();

      if (!user) {
        throw new Error("Debes iniciar sesión.");
      }

      await setNotificationPreferenceEnabled(user.id, eventKey, isEnabled);
      setItems((current) =>
        current.map((item) => (item.eventKey === eventKey ? { ...item, isEnabled } : item)),
      );
      setError(null);
    } catch (toggleError) {
      setError(
        toggleError instanceof Error ? toggleError.message : "No se pudo guardar la preferencia.",
      );
    } finally {
      setSavingKey(null);
    }
  }, []);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  return {
    items,
    loading,
    savingKey,
    error,
    togglePreference,
    refresh: loadPreferences,
  };
}
