import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/src/types/database";

const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const rawSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
const normalizedSupabaseUrl = rawSupabaseUrl?.replace(/\/rest\/v1\/?$/, "");

const isPlaceholderConfig =
  normalizedSupabaseUrl === "https://your-project-id.supabase.co" ||
  rawSupabaseAnonKey === "your-anon-key";

export const hasSupabaseConfig = Boolean(
  normalizedSupabaseUrl && rawSupabaseAnonKey && !isPlaceholderConfig,
);

const supabaseUrl = hasSupabaseConfig ? normalizedSupabaseUrl! : "https://example.supabase.co";
const supabaseAnonKey = hasSupabaseConfig ? rawSupabaseAnonKey! : "public-anon-key";

/** Operaciones BusControl: viajes, asistencia, app_profiles, etc. */
export const supabase: SupabaseClient<Database, "buscontrol"> = createClient<Database, "buscontrol">(
  supabaseUrl,
  supabaseAnonKey,
  { db: { schema: "buscontrol" } },
);

/** Padrón municipal compartido (solo lectura en V1). */
export const supabasePublic: SupabaseClient<Database, "public"> = createClient<Database, "public">(
  supabaseUrl,
  supabaseAnonKey,
  { db: { schema: "public" } },
);
