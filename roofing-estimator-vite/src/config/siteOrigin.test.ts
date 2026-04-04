import { describe, expect, it } from "vitest";
import { HD2D_WORKER_API_ORIGIN, apiOriginForHostname, isHd2dZoneHostname } from "./siteOrigin";

describe("isHd2dZoneHostname", () => {
  it("matches apex, www, and subdomains", () => {
    expect(isHd2dZoneHostname("hardcoredoortodoorclosers.com")).toBe(true);
    expect(isHd2dZoneHostname("www.hardcoredoortodoorclosers.com")).toBe(true);
    expect(isHd2dZoneHostname("app.hardcoredoortodoorclosers.com")).toBe(true);
    expect(isHd2dZoneHostname("localhost")).toBe(false);
  });
});

describe("apiOriginForHostname", () => {
  it("maps Vercel preview to Worker API origin", () => {
    expect(apiOriginForHostname("hd2d-closers.vercel.app")).toBe(HD2D_WORKER_API_ORIGIN);
    expect(apiOriginForHostname("foo-bar-123-solar.vercel.app")).toBe(HD2D_WORKER_API_ORIGIN);
  });

  it("maps Cloudflare Pages *.pages.dev to Worker API origin", () => {
    expect(apiOriginForHostname("main.hd2d-closers.pages.dev")).toBe(HD2D_WORKER_API_ORIGIN);
    expect(apiOriginForHostname("08fa9b7d.hd2d-closers.pages.dev")).toBe(HD2D_WORKER_API_ORIGIN);
  });

  it("returns null for HD2D zone so the SPA uses same-origin /api/*", () => {
    expect(apiOriginForHostname("app.hardcoredoortodoorclosers.com")).toBeNull();
    expect(apiOriginForHostname("hardcoredoortodoorclosers.com")).toBeNull();
    expect(apiOriginForHostname("www.hardcoredoortodoorclosers.com")).toBeNull();
  });

  it("returns null for unknown hosts so same-origin is used", () => {
    expect(apiOriginForHostname("localhost")).toBeNull();
  });
});
