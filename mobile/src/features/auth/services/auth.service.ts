import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/src/core/config/supabase";
import { supabaseAuthStorage } from "@/src/core/config/supabase-auth-storage";
import { clearLocalSessionData } from "@/src/features/auth/services/session-cleanup.service";
import { deactivatePushTokensForUser } from "@/src/features/notifications/services/push-token.service";
import { withDeadline } from "@/src/shared/utils/withTimeout";

const AUTH_STORAGE_KEY = "buscontrol-auth";
const SIGN_OUT_TIMEOUT_MS = 8_000;

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
    await withDeadline(deactivatePushTokensForUser(user.id), SIGN_OUT_TIMEOUT_MS).catch(() => undefined);
  }

  const { error } = await withDeadline(supabase.auth.signOut({ scope: "local" }), SIGN_OUT_TIMEOUT_MS);
  if (error) throw error;

  await clearLocalSessionData();
};

/**
 * Lee la sesion guardada directamente. supabase.auth.getSession() puede tardar minutos
 * sin red y con el token vencido, porque reintenta el refresco antes de responder.
 * La libreria sigue refrescando el token y avisa con SIGNED_OUT si deja de ser valido.
 */
export const getSession = async (): Promise<Session | null> => {
  try {
    const raw = await supabaseAuthStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
};

export const getUser = async (): Promise<User | null> => {
  const session = await getSession();
  return session?.user ?? null;
};
