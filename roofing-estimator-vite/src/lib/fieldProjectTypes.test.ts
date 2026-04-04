import { describe, expect, it } from "vitest";
import { normalizeFieldProject, optHttpsUrl } from "./fieldProjectTypes";

describe("optHttpsUrl", () => {
  it("accepts https URLs", () => {
    expect(optHttpsUrl("https://app.gohighlevel.com/v2/location/abc")).toMatch(/^https:/);
  });

  it("rejects http and non-urls", () => {
    expect(optHttpsUrl("http://example.com")).toBeUndefined();
    expect(optHttpsUrl("javascript:alert(1)")).toBeUndefined();
    expect(optHttpsUrl("")).toBeUndefined();
  });
});

describe("normalizeFieldProject", () => {
  const base = {
    id: "fp-1",
    name: "Job",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    pipelineStage: "intake",
    photos: [],
  };

  it("preserves valid ghlUrl and ghlEmbedUrl", () => {
    const p = normalizeFieldProject({
      ...base,
      ghlUrl: "https://app.gohighlevel.com/opportunity/xyz",
      ghlEmbedUrl: "https://app.gohighlevel.com/embed/foo",
    });
    expect(p?.ghlUrl).toContain("gohighlevel");
    expect(p?.ghlEmbedUrl).toContain("embed");
  });

  it("drops invalid GHL fields", () => {
    const p = normalizeFieldProject({
      ...base,
      ghlUrl: "http://insecure.example",
      ghlEmbedUrl: "not-a-url",
    });
    expect(p?.ghlUrl).toBeUndefined();
    expect(p?.ghlEmbedUrl).toBeUndefined();
  });
});
