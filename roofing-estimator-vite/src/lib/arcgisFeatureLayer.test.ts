import { describe, expect, it } from "vitest";
import { normalizeArcgisFeatureLayerUrl } from "./arcgisFeatureLayer";

describe("normalizeArcgisFeatureLayerUrl", () => {
  it("accepts standard layer URLs", () => {
    expect(
      normalizeArcgisFeatureLayerUrl(
        "https://services.arcgis.com/xyz/ArcGIS/rest/services/Parcels/FeatureServer/0",
      ),
    ).toBe("https://services.arcgis.com/xyz/ArcGIS/rest/services/Parcels/FeatureServer/0");
  });

  it("strips trailing slash and /query", () => {
    expect(
      normalizeArcgisFeatureLayerUrl(
        "https://example.com/arcgis/rest/services/L/FeatureServer/12/query/",
      ),
    ).toBe("https://example.com/arcgis/rest/services/L/FeatureServer/12");
  });

  it("rejects non layer URLs", () => {
    expect(normalizeArcgisFeatureLayerUrl("https://example.com/map")).toBeNull();
    expect(normalizeArcgisFeatureLayerUrl("")).toBeNull();
  });
});
