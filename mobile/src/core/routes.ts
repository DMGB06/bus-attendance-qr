export const OPS_ROUTES = {
  trip: "/(ops)/(tabs)/trip",
  scanner: "/(ops)/(tabs)/scanner",
  roster: "/(ops)/(tabs)/roster",
  profile: "/(ops)/(tabs)/profile",
  closeTrip: "/(ops)/(tabs)/close-trip",
  activity: "/(ops)/(tabs)/activity",
} as const;

export const PARENT_ROUTES = {
  home: "/(parent)/(tabs)/home",
  map: "/(parent)/(tabs)/map",
  profile: "/(parent)/(tabs)/profile",
  child: (studentId: string) => `/(parent)/child/${studentId}` as const,
} as const;

export const AUTH_ROUTES = {
  login: "/(auth)/login",
} as const;

/** Destinos válidos tras login (ops o padre). */
export type PostLoginHref = typeof OPS_ROUTES.trip | typeof PARENT_ROUTES.home;
