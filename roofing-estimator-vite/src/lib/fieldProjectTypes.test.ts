import { describe, expect, it } from "vitest";
import { normalizeDamagePhoto, normalizeFieldProject, optHttpsUrl } from "./fieldProjectTypes";

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
    tags: [],
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

  it("normalizes tags and deal value", () => {
    const p = normalizeFieldProject({
      ...base,
      tags: "hail, priority, hail",
      monetaryValueUsd: 12500.456,
      ownerLabel: "Alex",
    });
    expect(p?.tags).toEqual(["hail", "priority"]);
    expect(p?.monetaryValueUsd).toBe(12500.46);
    expect(p?.ownerLabel).toBe("Alex");
  });

  it("keeps synced photos with empty imageDataUrl and remoteKey", () => {
    const p = normalizeFieldProject({
      ...base,
      photos: [
        {
          id: "ph-1",
          capturedAt: "2026-01-01T00:00:00.000Z",
          imageDataUrl: "",
          remoteKey: "workspace/u1/ph-1.jpg",
          caption: "north slope",
        },
      ],
    });
    expect(p?.photos).toHaveLength(1);
    expect(p?.photos[0]?.imageDataUrl).toBe("");
    expect(p?.photos[0]?.remoteKey).toBe("workspace/u1/ph-1.jpg");
    expect(p?.photos[0]?.caption).toBe("north slope");
  });
});

describe("normalizeDamagePhoto", () => {
  it("accepts local JPEG data URLs", () => {
    const ph = normalizeDamagePhoto({
      id: "ph-1",
      capturedAt: "2026-01-01T00:00:00.000Z",
      imageDataUrl: "data:image/jpeg;base64,abc",
    });
    expect(ph?.imageDataUrl).toMatch(/^data:image\/jpeg/);
  });

  it("rejects non-image data URLs", () => {
    expect(
      normalizeDamagePhoto({
        id: "ph-1",
        capturedAt: "2026-01-01T00:00:00.000Z",
        imageDataUrl: "https://example.com/x.jpg",
      }),
    ).toBeNull();
  });
});
