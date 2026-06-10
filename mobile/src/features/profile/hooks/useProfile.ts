import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import { getErrorMessage } from "@/src/shared/utils/errors";
import { getUser } from "@/src/features/auth/services/auth.service";
import { getProfile, updateProfile } from "@/src/features/profile/services/profile.service";
import { getMemoryCachedProfile } from "@/src/features/profile/storage/profile-cache.storage";
import { Area, Role, type Profile, type UpdateProfile } from "@/src/features/profile/types";

function mapEnumValue<T extends string>(value: string, allowed: readonly T[]): T | null {
  const normalized = value.trim().toUpperCase();
  return (allowed as readonly string[]).includes(normalized) ? (normalized as T) : null;
}

function applyProfileToState(
  loadedProfile: Profile | null,
  userEmail: string,
  setters: {
    setProfile: (value: Profile | null) => void;
    setEmail: (value: string) => void;
    setRole: (value: string) => void;
    setArea: (value: string) => void;
  },
) {
  if (loadedProfile) {
    setters.setProfile(loadedProfile);
    setters.setEmail(loadedProfile.email ?? userEmail);
    setters.setRole(loadedProfile.role ?? "");
    setters.setArea(loadedProfile.area ?? "");
    return;
  }

  setters.setProfile(null);
  setters.setEmail(userEmail);
  setters.setRole("");
  setters.setArea("");
}

export function useProfile() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [area, setArea] = useState("");

  const loadProfile = useCallback(async (forceRefresh = false) => {
    const user = await getUser();
    if (!user) {
      throw new Error("Usuario no autenticado");
    }

    const userEmail = user.email ?? "";

    if (!forceRefresh) {
      const memoryProfile = userEmail ? getMemoryCachedProfile(userEmail) : null;
      if (memoryProfile) {
        applyProfileToState(memoryProfile, userEmail, {
          setProfile,
          setEmail,
          setRole,
          setArea,
        });
        return;
      }
    }

    const loadedProfile = await getProfile(userEmail, { forceRefresh });
    applyProfileToState(loadedProfile, userEmail, {
      setProfile,
      setEmail,
      setRole,
      setArea,
    });
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
      const payload: UpdateProfile = {
        email: email || undefined,
        role: mapEnumValue(role, Object.values(Role)),
        area: mapEnumValue(area, Object.values(Area)),
      };

      const updated = await updateProfile(profile.id, payload);
      setProfile(updated);
      setEditing(false);
    } catch (error: unknown) {
      Alert.alert("Error", getErrorMessage(error, "No se pudo guardar"));
    } finally {
      setSaving(false);
    }
  }, [profile, email, role, area]);

  const initials = useMemo(() => {
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
    role,
    area,
    initials,
    displayName,
    setEditing,
    handleSave,
    refreshProfile,
  };
}
