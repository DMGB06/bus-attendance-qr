export enum Role {
  ADMIN = "ADMIN",
  VISOR = "VISOR",
}

export enum Area {
  ADMIN = "ADMIN",
  COMERCIALIZACION = "COMERCIALIZACION",
  INFORMATICA = "INFORMATICA",
  DESAROLLO_SOCIAL = "DESAROLLO SOCIAL",
}

export type Profile = {
  id: string;
  email: string;
  role: Role | null;
  area: Area | null;
};

export type UpdateProfile = {
  email?: string;
  role?: Role | null;
  area?: Area | null;
};
