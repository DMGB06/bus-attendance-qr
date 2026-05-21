import { supabase } from "@/src/core/config/supabase";
import type { Area, Profile, Role, UpdateProfile } from "../types";

export async function getProfile(email: string): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").select().eq("email", email).single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}
