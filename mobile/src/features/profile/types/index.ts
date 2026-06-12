export enum AppRole {
  CHOFER = "chofer",
  ASISTENTA = "asistenta",
  PADRE = "padre",
  COORDINADOR = "coordinador",
}

export type AppProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  app_role: AppRole | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type UpdateAppProfile = {
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
};

/** @deprecated Perfil municipal SIGEM; BusControl usa AppProfile. */
export enum Role {
  ADMIN = "ADMIN",
  VISOR = "VISOR",
}

/** @deprecated Perfil municipal SIGEM; BusControl usa AppProfile. */
export enum Area {
  ADMIN = "ADMIN",
  COMERCIALIZACION = "COMERCIALIZACION",
  INFORMATICA = "INFORMATICA",
  DESAROLLO_SOCIAL = "DESAROLLO SOCIAL",
}

/** Alias de compatibilidad mientras migra la UI de perfil. */
export type Profile = AppProfile;

export type UpdateProfile = UpdateAppProfile;
