import type { ParentBusLocation } from "@/src/features/parent/types/bus-location";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** URL para abrir la ubicación en OpenStreetMap (gratis, sin API key). */
export function buildOsmExternalUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
}

/** URL embebida para iframe en web. */
export function buildOsmEmbedUrl(lat: number, lng: number): string {
  const delta = 0.02;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lng}`;
}

/** HTML Leaflet para mapa embebido en WebView (Android, gratis). */
export function buildParentOsmMapHtml(
  locations: ParentBusLocation[],
  focusLat: number,
  focusLng: number,
): string {
  const markers = locations
    .map((location) => {
      const label = escapeHtml(location.studentNames.join(", ") || "Bus escolar");
      return `L.marker([${location.lat}, ${location.lng}]).addTo(map).bindPopup("${label}");`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      html, body, #map { height: 100%; margin: 0; background: #e8edf5; }
      .leaflet-control-attribution { font-size: 10px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const map = L.map("map", { zoomControl: true }).setView([${focusLat}, ${focusLng}], 14);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap"
      }).addTo(map);
      ${markers}
    </script>
  </body>
</html>`;
}
