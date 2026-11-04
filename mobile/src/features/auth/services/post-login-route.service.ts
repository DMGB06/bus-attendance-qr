import type { User } from "@supabase/supabase-js";
import { OPS_ROUTES, PARENT_ROUTES, type PostLoginHref } from "@/src/core/routes";
import { getEffectiveRole, isOpsRole, isParentRole } from "@/src/features/auth/domain/permissions";
import { getGuardianLinksForUser } from "@/src/features/parent/services/guardians.service";
import { getProfileById } from "@/src/features/profile/services/profile.service";
import { loadCachedProfile } from "@/src/features/profile/storage/profile-cache.storage";
import type { AppProfile } from "@/src/features/profile/types";

function hrefForProfile(profile: AppProfile | null): PostLoginHref | null {
  const role = getEffectiveRole(profile);
  if (isParentRole(role)) {
    return PARENT_ROUTES.home;
  }
  return isOpsRole(role) ? OPS_ROUTES.trip : null;
}

/**
 * Resuelve la ruta inicial tras login. Devuelve null si la cuenta no tiene acceso
 * y lanza error si no se pudo consultar: nunca asume un rol.
 * Operadores siempre van a ops aunque tengan vínculos de apoderado.
 */
export async function resolvePostLoginHref(
  userId: string,
  user?: User | null,
): Promise<PostLoginHref | null> {
  const profile = await getProfileById(userId, user);
  const href = hrefForProfile(profile);
  if (href || profile?.is_active === false) {
    return href;
  }

  const guardianLinks = await getGuardianLinksForUser(userId);
  return guardianLinks.length > 0 ? PARENT_ROUTES.home : null;
}

export async function resolveCachedPostLoginHref(
  user: User | null,
): Promise<PostLoginHref | null> {
  const profile = user?.email ? await loadCachedProfile(user.email) : null;
  return profile?.id === user?.id ? hrefForProfile(profile) : null;
}
