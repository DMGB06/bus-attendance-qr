export const TRIP_LOCATION_PUBLISH_INTERVAL_MS = 25_000;
export const PARENT_LOCATION_POLL_INTERVAL_MS = 15_000;

/** Aproximado Cerro Azul (fallback del mapa). */
export const DEFAULT_MAP_REGION = {
  latitude: -8.116,
  longitude: -79.033,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
} as const;
