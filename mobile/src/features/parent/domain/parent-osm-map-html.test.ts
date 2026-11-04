import { buildParentOsmMapHtml } from "@/src/features/parent/domain/parent-osm-map-html";
import type { ParentBusLocation } from "@/src/features/parent/types/bus-location";

const location = (studentNames: string[]) =>
  ({ tripId: "t1", lat: -13, lng: -76, studentNames }) as ParentBusLocation;

describe("buildParentOsmMapHtml", () => {
  it("carga Leaflet con verificacion de integridad", () => {
    const html = buildParentOsmMapHtml([], -13, -76);

    expect(html).toContain('integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="');
    expect(html).toContain('integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="');
  });

  it("un nombre con barra invertida o salto de linea no rompe el script", () => {
    const html = buildParentOsmMapHtml([location(["Ana\\", "Luis\nPerez"])], -13, -76);

    expect(html).toContain('bindPopup("Ana\\\\, Luis\\nPerez")');
  });

  it("escapa el HTML del nombre", () => {
    const html = buildParentOsmMapHtml([location(["<img src=x>"])], -13, -76);

    expect(html).not.toContain("<img src=x>");
  });
});
