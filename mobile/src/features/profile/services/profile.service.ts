import { supabase } from "@/src/core/config/supabase";
import type { Area, Profile, Role, UpdateProfile } from "../types";

export async function getProfile(email: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select().eq("email", email).single();

  if (error) {
    // if not found, return null to let caller decide
    if (error.code === "PGRST116" || error.message?.includes("No rows")) {
      return null;
    }
    throw new Error(error.message);
  }
  return data as Profile;
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
  // Build a minimal DB payload where fields are either the proper enum values or undefined.
  // We convert `null` to `undefined` so the Supabase typings (which expect `T | undefined`) accept it.
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
  return data as Profile;
}
