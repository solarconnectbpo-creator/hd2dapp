import { describe, expect, it } from "vitest";
import { HD2D_WORKER_API_ORIGIN, apiOriginForHostname } from "./siteOrigin";

describe("apiOriginForHostname", () => {
  it("maps Vercel preview to Worker API origin", () => {
    expect(apiOriginForHostname("hd2d-closers.vercel.app")).toBe(HD2D_WORKER_API_ORIGIN);
    expect(apiOriginForHostname("foo-bar-123-solar.vercel.app")).toBe(HD2D_WORKER_API_ORIGIN);
  });

  it("maps Cloudflare Pages *.pages.dev to Worker API origin", () => {
    expect(apiOriginForHostname("main.hd2d-closers.pages.dev")).toBe(HD2D_WORKER_API_ORIGIN);
    expect(apiOriginForHostname("08fa9b7d.hd2d-closers.pages.dev")).toBe(HD2D_WORKER_API_ORIGIN);
  });

  it("maps app subdomain to Worker API origin", () => {
    expect(apiOriginForHostname("app.hardcoredoortodoorclosers.com")).toBe(HD2D_WORKER_API_ORIGIN);
  });

  it("maps apex and www to Worker API origin", () => {
    expect(apiOriginForHostname("hardcoredoortodoorclosers.com")).toBe(HD2D_WORKER_API_ORIGIN);
    expect(apiOriginForHostname("www.hardcoredoortodoorclosers.com")).toBe(HD2D_WORKER_API_ORIGIN);
  });

  it("returns null for unknown hosts so same-origin is used", () => {
    expect(apiOriginForHostname("localhost")).toBeNull();
  });
});
