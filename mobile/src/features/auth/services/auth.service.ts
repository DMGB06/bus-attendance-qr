import { isAuthRetryableFetchError, type User } from "@supabase/supabase-js";

import { supabase } from "@/src/core/config/supabase";
import { supabaseAuthStorage } from "@/src/core/config/supabase-auth-storage";
import { clearLocalSessionData } from "@/src/features/auth/services/session-cleanup.service";

const AUTH_STORAGE_KEY = "buscontrol-auth";

export const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
};

export const requestPasswordReset = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
  return data;
};

export const logout = async () => {
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;

  await clearLocalSessionData();
};

async function loadStoredUser(): Promise<User | null> {
  const raw = await supabaseAuthStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  return (JSON.parse(raw) as { user?: User }).user ?? null;
}

/** Usuario de la sesion local: no usa la red para que la app funcione en ruta sin senal. */
export const getUser = async (): Promise<User | null> => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) {
    // Token vencido sin red: la sesion sigue valida hasta que se pueda refrescar.
    if (isAuthRetryableFetchError(error)) {
      return loadStoredUser();
    }
    throw error;
  }
  return session?.user ?? null;
};

export const getSession = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};
