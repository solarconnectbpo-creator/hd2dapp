import { describe, expect, it } from "vitest";
import { buildCoxSolarMarketingHtml, coxSolarNemDiagramSvg } from "./buildCoxSolarMarketingHtml";
import {
  COX_SOLAR_AD_COPY,
  COX_SOLAR_BRAND,
  COX_SOLAR_INCENTIVES,
  COX_SOLAR_TALK_TRACKS,
  coxSolarContactLine,
} from "./coxSolarMarketingContent";

describe("Cox Roofing Solar marketing pack", () => {
  it("keeps Oak Brook Cox contact on every leave-behind line", () => {
    expect(coxSolarContactLine()).toContain(COX_SOLAR_BRAND.legalName);
    expect(coxSolarContactLine()).toContain("Oak Brook");
    expect(coxSolarContactLine()).toContain(COX_SOLAR_BRAND.phoneDisplay);
  });

  it("lists the Illinois and Chicago programs from the closer kit", () => {
    const ids = COX_SOLAR_INCENTIVES.map((i) => i.id);
    expect(ids).toEqual([
      "ilsfa",
      "comed-dg-solar",
      "comed-dg-battery",
      "vpp",
      "nem-ssb",
      "property-tax",
      "chi-express",
      "chi-green",
    ]);
    expect(COX_SOLAR_INCENTIVES.some((i) => i.summary.includes("$300-per-kW"))).toBe(true);
    expect(COX_SOLAR_INCENTIVES.some((i) => i.summary.includes("$300-per-kWh"))).toBe(true);
    expect(COX_SOLAR_INCENTIVES.some((i) => i.summary.includes("January 1, 2025"))).toBe(true);
  });

  it("builds a homeowner guide without competitor brands", () => {
    const html = buildCoxSolarMarketingHtml("guide");
    expect(html).toContain("Cox Solar Solutions");
    expect(html).toContain(COX_SOLAR_BRAND.pitch);
    expect(html).toContain("Illinois Solar for All");
    expect(html).toContain("Smart Solar Billing");
    expect(html).toContain("Solar Express");
    expect(html).toContain(COX_SOLAR_BRAND.phoneDisplay);
    expect(html).toContain("aria-label=");
    expect(html).not.toContain("Palmetto");
    expect(html).not.toContain("Freedom Forever");
    expect(html).not.toContain("Repair King");
  });

  it("builds a one-page leave-behind with the pay-for-power pitch", () => {
    const html = buildCoxSolarMarketingHtml("leavebehind");
    expect(html).toContain("You provide the roof");
    expect(html).toContain("$300 per kW");
    expect(html).toContain("Your Roof, Our Legacy");
    expect(html).toContain("/cox-solar-solutions-logo.svg");
  });

  it("renders an original net-metering diagram", () => {
    const svg = coxSolarNemDiagramSvg();
    expect(svg).toContain("<svg");
    expect(svg).toContain("Utility grid");
    expect(svg).not.toContain("Palmetto");
  });

  it("includes closer talk tracks and ad presets", () => {
    expect(COX_SOLAR_TALK_TRACKS.length).toBeGreaterThanOrEqual(4);
    expect(COX_SOLAR_AD_COPY.every((a) => a.headline.length > 0 && a.body.length > 0)).toBe(true);
  });
});
