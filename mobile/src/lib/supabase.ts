import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/src/types";

const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const rawSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
const normalizedSupabaseUrl = rawSupabaseUrl?.replace(/\/rest\/v1\/?$/, "");

const isPlaceholderConfig =
  normalizedSupabaseUrl === "https://your-project-id.supabase.co" ||
  rawSupabaseAnonKey === "your-anon-key";

export const hasSupabaseConfig = Boolean(
  normalizedSupabaseUrl && rawSupabaseAnonKey && !isPlaceholderConfig,
);

const supabaseUrl = hasSupabaseConfig
  ? normalizedSupabaseUrl!
  : "https://example.supabase.co";
const supabaseAnonKey = hasSupabaseConfig
  ? rawSupabaseAnonKey!
  : "public-anon-key";

export const supabase: SupabaseClient<Database, "public"> = createClient<
  Database,
  "public"
>(supabaseUrl, supabaseAnonKey);
