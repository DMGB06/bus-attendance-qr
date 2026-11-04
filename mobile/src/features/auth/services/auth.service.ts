import { isAuthRetryableFetchError, type Session, type User } from "@supabase/supabase-js";

import { supabase } from "@/src/core/config/supabase";
import { supabaseAuthStorage } from "@/src/core/config/supabase-auth-storage";
import { clearLocalSessionData } from "@/src/features/auth/services/session-cleanup.service";
import { deactivatePushTokensForUser } from "@/src/features/notifications/services/push-token.service";

const AUTH_STORAGE_KEY = "buscontrol-auth";

export const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
};

export const logout = async () => {
  // Debe ir antes de signOut: sin sesion, RLS ya no permite tocar el token.
  const user = await getUser().catch(() => null);
  if (user) {
    await deactivatePushTokensForUser(user.id).catch(() => undefined);
  }

  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;

  await clearLocalSessionData();
};

async function loadStoredSession(): Promise<Session | null> {
  const raw = await supabaseAuthStorage.getItem(AUTH_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}

/**
 * Sesion local: no usa la red. Con el token vencido y sin senal, la sesion guardada
 * sigue siendo la del usuario hasta que se pueda refrescar.
 */
export const getSession = async (): Promise<Session | null> => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) {
    if (isAuthRetryableFetchError(error)) {
      return loadStoredSession();
    }
    throw error;
  }
  return session;
};

export const getUser = async (): Promise<User | null> => {
  const session = await getSession();
  return session?.user ?? null;
};
