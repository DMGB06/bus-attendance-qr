import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import { getErrorMessage } from "@/src/shared/utils/errors";
import { getUser } from "@/src/features/auth/services/auth.service";
import {
  getProfile,
  getProfileById,
  updateProfile,
} from "@/src/features/profile/services/profile.service";
import { getMemoryCachedProfile } from "@/src/features/profile/storage/profile-cache.storage";
import type { AppProfile, UpdateAppProfile } from "@/src/features/profile/types";

function applyProfileToState(
  loadedProfile: AppProfile | null,
  userEmail: string,
  setters: {
    setProfile: (value: AppProfile | null) => void;
    setEmail: (value: string) => void;
    setFullName: (value: string) => void;
    setPhone: (value: string) => void;
    setAppRole: (value: string) => void;
  },
) {
  if (loadedProfile) {
    setters.setProfile(loadedProfile);
    setters.setEmail(loadedProfile.email ?? userEmail);
    setters.setFullName(loadedProfile.full_name ?? "");
    setters.setPhone(loadedProfile.phone ?? "");
    setters.setAppRole(loadedProfile.app_role ?? "");
    return;
  }

  setters.setProfile(null);
  setters.setEmail(userEmail);
  setters.setFullName("");
  setters.setPhone("");
  setters.setAppRole("");
}

export function useProfile() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [appRole, setAppRole] = useState("");

  const loadProfile = useCallback(async (forceRefresh = false) => {
    const user = await getUser();
    if (!user) {
      throw new Error("Usuario no autenticado");
    }

    const userEmail = user.email ?? "";
    const setters = {
      setProfile,
      setEmail,
      setFullName,
      setPhone,
      setAppRole,
    };

    if (!forceRefresh) {
      const memoryProfile = userEmail ? getMemoryCachedProfile(userEmail) : null;
      if (memoryProfile) {
        applyProfileToState(memoryProfile, userEmail, setters);
        return;
      }
    }

    const loadedById = await getProfileById(user.id, user);
    if (loadedById) {
      applyProfileToState(loadedById, userEmail, setters);
      return;
    }

    const loadedProfile = userEmail
      ? await getProfile(userEmail, { forceRefresh, user })
      : null;
    applyProfileToState(loadedProfile, userEmail, setters);
  }, []);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        await loadProfile(false);
      } catch (error: unknown) {
        console.warn("Error cargando perfil", getErrorMessage(error, "Error desconocido"));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadProfile(true);
    } catch (error: unknown) {
      Alert.alert("Error", getErrorMessage(error, "No se pudo actualizar el perfil."));
    } finally {
      setRefreshing(false);
    }
  }, [loadProfile]);

  const handleSave = useCallback(async () => {
    if (!profile) {
      Alert.alert("Perfil no encontrado", "No se puede actualizar un perfil inexistente");
      return;
    }

    setSaving(true);

    try {
      const payload: UpdateAppProfile = {
        email: email || undefined,
        full_name: fullName || null,
        phone: phone || null,
      };

      const updated = await updateProfile(profile.id, payload);
      setProfile(updated);
      setEditing(false);
    } catch (error: unknown) {
      Alert.alert("Error", getErrorMessage(error, "No se pudo guardar"));
    } finally {
      setSaving(false);
    }
  }, [profile, email, fullName, phone]);

  const initials = useMemo(() => {
    const fromName = profile?.full_name?.trim();
    if (fromName) {
      const parts = fromName.split(/\s+/).filter(Boolean);
      const letters = parts
        .map((part) => part[0])
        .slice(0, 2)
        .join("");
      if (letters) {
        return letters.toUpperCase();
      }
    }

    const source = profile?.email ?? email;
    if (!source) {
      return "US";
    }

    const name = source.split("@")[0];
    const parts = name.split(/[^a-zA-Z0-9]+/).filter(Boolean);
    const letters = parts
      .map((part) => part[0])
      .slice(0, 2)
      .join("");

    return letters.toUpperCase() || "US";
  }, [profile, email]);

  const displayName = useMemo(() => {
    if (profile?.full_name?.trim()) {
      return profile.full_name.trim();
    }

    if (profile?.email) {
      const name = profile.email.split("@")[0];
      return name.replace(/[._]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
    }

    return email.split("@")[0] || "Usuario";
  }, [profile, email]);

  return {
    loading,
    refreshing,
    saving,
    editing,
    profile,
    email,
    fullName,
    phone,
    appRole,
    initials,
    displayName,
    setEditing,
    handleSave,
    refreshProfile,
  };
}
