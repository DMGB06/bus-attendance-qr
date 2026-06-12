export function formatLocationAge(lastLocationAt: string | null | undefined): string {
  if (!lastLocationAt) {
    return "Sin ubicación reciente";
  }

  const timestamp = new Date(lastLocationAt).getTime();

  if (Number.isNaN(timestamp)) {
    return "Sin ubicación reciente";
  }

  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) {
    return "Actualizado hace un momento";
  }

  if (minutes === 1) {
    return "Actualizado hace 1 min";
  }

  return `Actualizado hace ${minutes} min`;
}

export function hasValidCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined,
): lat is number {
  return typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng);
}
