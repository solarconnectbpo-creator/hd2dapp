import { describe, expect, it } from "vitest";
import { formatWorkerFetchFailure, parseWorkerErrorBody } from "./workerApiError";

describe("parseWorkerErrorBody", () => {
  it("returns error string from JSON", () => {
    expect(parseWorkerErrorBody('{"error":"ROOF_VISION_SERVICE_URL is not set"}')).toBe(
      "ROOF_VISION_SERVICE_URL is not set",
    );
  });
  it("returns null for invalid JSON", () => {
    expect(parseWorkerErrorBody("not json")).toBeNull();
  });
  it("returns FastAPI detail string", () => {
    expect(parseWorkerErrorBody(JSON.stringify({ detail: "SAM service unreachable" }))).toBe(
      "SAM service unreachable",
    );
  });
});

describe("formatWorkerFetchFailure", () => {
  it("appends deployment hint for 503 roof vision errors", () => {
    const res = new Response(null, { status: 503 });
    const msg = formatWorkerFetchFailure(
      res,
      JSON.stringify({ success: false, error: "ROOF_VISION_SERVICE_URL is not set" }),
      "fallback",
    );
    expect(msg).toContain("ROOF_VISION_SERVICE_URL");
    expect(msg).toContain("PHASE0_GREEN_PATH");
  });
});
