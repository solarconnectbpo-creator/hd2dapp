import { describe, expect, it } from "vitest";
import { buildFootprintDxfFromPolygons } from "./roofDxfExport";
import type { Feature, Polygon } from "geojson";

describe("buildFootprintDxfFromPolygons", () => {
  it("emits DXF sections and LWPOLYLINE for a square", () => {
    const poly: Feature<Polygon> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-90.2, 38.63],
            [-90.19, 38.63],
            [-90.19, 38.64],
            [-90.2, 38.64],
            [-90.2, 38.63],
          ],
        ],
      },
    };
    const dxf = buildFootprintDxfFromPolygons([poly]);
    expect(dxf).toContain("SECTION");
    expect(dxf).toContain("LWPOLYLINE");
    expect(dxf).toContain("EOF");
  });
});
