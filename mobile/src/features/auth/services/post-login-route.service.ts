import { OPS_ROUTES, PARENT_ROUTES, type PostLoginHref } from "@/src/core/routes";
import { isOpsRole, isParentRole } from "@/src/features/auth/domain/permissions";
import { getGuardianLinksForUser } from "@/src/features/parent/services/guardians.service";
import { getProfileById } from "@/src/features/profile/services/profile.service";

/**
 * Resuelve la ruta inicial tras login.
 * Operadores (chofer/asistenta/coordinador) siempre van a ops aunque tengan vínculos apoderado.
 * Padres explícitos o sin rol pero con vínculos van a la vista de padre.
 */
export async function resolvePostLoginHref(userId: string): Promise<PostLoginHref> {
  const profile = await getProfileById(userId).catch(() => null);
  const role = profile?.app_role ?? null;

  if (isParentRole(role)) {
    return PARENT_ROUTES.home;
  }

  if (isOpsRole(role)) {
    return OPS_ROUTES.trip;
  }

  const guardianLinks = await getGuardianLinksForUser(userId).catch(() => []);
  if (guardianLinks.length > 0) {
    return PARENT_ROUTES.home;
  }

  return OPS_ROUTES.trip;
}
