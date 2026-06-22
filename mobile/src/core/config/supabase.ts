import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

import { supabaseAuthStorage } from "@/src/core/config/supabase-auth-storage";
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

const isBrowserWeb = typeof window !== "undefined" && Platform.OS === "web";

const sharedAuthOptions = {
  auth: {
    storage: supabaseAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storageKey: "buscontrol-auth",
    ...(isBrowserWeb
      ? {
          // Evita "Lock broken by steal" con dos clientes / Strict Mode en web.
          lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<unknown>) =>
            fn(),
        }
      : {}),
  },
} as const;

/** Operaciones BusControl: viajes, asistencia, app_profiles, etc. */
export const supabase: SupabaseClient<Database, "buscontrol"> = createClient<Database, "buscontrol">(
  supabaseUrl,
  supabaseAnonKey,
  { db: { schema: "buscontrol" }, ...sharedAuthOptions },
);

/** Padrón municipal — mismo auth que `supabase`, schema `public` (sin segundo GoTrueClient). */
export const supabasePublic = supabase.schema("public") as SupabaseClient<Database, "public">;
