import { supabase } from "@/src/core/config/supabase";
import {
  loadCachedProfile,
  saveCachedProfile,
} from "@/src/features/profile/storage/profile-cache.storage";
import type { Area, Profile, Role, UpdateProfile } from "../types";

export async function getProfile(
  email: string,
  options?: { forceRefresh?: boolean },
): Promise<Profile | null> {
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
    .from("profiles")
    .select()
    .eq("email", normalizedEmail)
    .single();

  if (error) {
    if (error.code === "PGRST116" || error.message?.includes("No rows")) {
      return null;
    }
    const cached = await loadCachedProfile(normalizedEmail);
    if (cached) {
      return cached;
    }
    throw new Error(error.message);
  }

  const profile = data as Profile;
  await saveCachedProfile(normalizedEmail, profile);
  return profile;
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select().eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116" || error.message?.includes("No rows")) {
      return null;
    }
    throw new Error(error.message);
  }
  return data as Profile;
}

export async function updateProfile(id: string, payload: UpdateProfile): Promise<Profile> {
  const dbPayload: { email?: string; role?: Role; area?: Area } = {};
  if (payload.email !== undefined) dbPayload.email = payload.email;
  if (payload.role !== undefined && payload.role !== null) dbPayload.role = payload.role;
  if (payload.area !== undefined && payload.area !== null) dbPayload.area = payload.area;

  const { data, error } = await supabase
    .from("profiles")
    .update(dbPayload as unknown as { email?: string; role?: Role; area?: Area })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }

  const profile = data as Profile;
  if (profile.email) {
    await saveCachedProfile(profile.email, profile);
  }
  return profile;
}
