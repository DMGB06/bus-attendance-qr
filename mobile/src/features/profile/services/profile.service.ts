import { supabase } from "@/src/core/config/supabase";
import {
  loadCachedProfile,
  saveCachedProfile,
} from "@/src/features/profile/storage/profile-cache.storage";
import type { AppProfile, UpdateAppProfile } from "../types";

export async function getProfile(
  email: string,
  options?: { forceRefresh?: boolean },
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

  const { data, error } = await supabase
    .from("app_profiles")
    .select()
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    const cached = await loadCachedProfile(normalizedEmail);
    if (cached) {
      return cached;
    }
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const profile = data as AppProfile;
  if (profile.email) {
    await saveCachedProfile(profile.email, profile);
  }
  return profile;
}

export async function getProfileById(id: string): Promise<AppProfile | null> {
  const { data, error } = await supabase.from("app_profiles").select().eq("id", id).maybeSingle();
  if (error) {
    if (error.code === "PGRST116" || error.message?.includes("No rows")) {
      return null;
    }
    throw new Error(error.message);
  }
  return data as AppProfile | null;
}

export async function updateProfile(id: string, payload: UpdateAppProfile): Promise<AppProfile> {
  const dbPayload: UpdateAppProfile = {};
  if (payload.email !== undefined) dbPayload.email = payload.email;
  if (payload.full_name !== undefined) dbPayload.full_name = payload.full_name;
  if (payload.phone !== undefined) dbPayload.phone = payload.phone;

  const { data, error } = await supabase
    .from("app_profiles")
    .update(dbPayload)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }

  const profile = data as AppProfile;
  if (profile.email) {
    await saveCachedProfile(profile.email, profile);
  }
  return profile;
}
