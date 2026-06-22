import { supabase } from "@/src/core/config/supabase";
import { getUser } from "@/src/features/auth/services/auth.service";
import {
  loadCachedProfile,
  saveCachedProfile,
} from "@/src/features/profile/storage/profile-cache.storage";
import type { User } from "@supabase/supabase-js";
import type { AppProfile, UpdateAppProfile } from "../types";

async function persistProfileCache(profile: AppProfile): Promise<void> {
  if (profile.email) {
    await saveCachedProfile(profile.email, profile);
  }
}

/** Perfil del usuario autenticado vía RPC (bypass RLS seguro). */
export async function getOwnProfile(): Promise<AppProfile | null> {
  const { data, error } = await supabase.rpc("get_own_profile");

  if (error) {
    throw new Error(error.message);
  }

  const profile = data as AppProfile | null;
  if (profile) {
    await persistProfileCache(profile);
  }
  return profile;
}

export async function getProfile(
  email: string,
  options?: { forceRefresh?: boolean; user?: User | null },
): Promise<AppProfile | null> {
  const normalizedEmail = email.trim();
  if (!normalizedEmail) {
    return null;
  }

  if (!options?.forceRefresh) {
    const cached = await loadCachedProfile(normalizedEmail);
    if (cached) {
      return cached;
    }
  }

  const user = options?.user ?? (await getUser());
  if (!user) {
    return null;
  }

  const profile = await getOwnProfile();
  if (!profile) {
    return null;
  }

  if (profile.email?.trim().toLowerCase() !== normalizedEmail.toLowerCase()) {
    return null;
  }

  return profile;
}

export async function getProfileById(
  id: string,
  user?: User | null,
): Promise<AppProfile | null> {
  const resolvedUser = user ?? (await getUser());
  if (!resolvedUser || resolvedUser.id !== id) {
    return null;
  }

  return getOwnProfile();
}

export async function updateProfile(id: string, payload: UpdateAppProfile): Promise<AppProfile> {
  const { data, error } = await supabase.rpc("update_own_profile", {
    p_full_name: payload.full_name ?? null,
    p_phone: payload.phone ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  const profile = data as AppProfile;
  if (profile.email) {
    await saveCachedProfile(profile.email, profile);
  }
  return profile;
}
