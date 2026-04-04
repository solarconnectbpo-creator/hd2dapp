import { describe, expect, it } from "vitest";
import { readJsonResponseBody } from "./readJsonResponse";

describe("readJsonResponseBody", () => {
  it("parses valid JSON", async () => {
    const res = new Response('{"success":true}', { status: 200 });
    await expect(readJsonResponseBody<{ success: boolean }>(res)).resolves.toEqual({ success: true });
  });

  it("throws on empty body", async () => {
    const res = new Response("", { status: 200 });
    await expect(readJsonResponseBody(res)).rejects.toThrow(/Empty response/);
  });

  it("throws on HTML", async () => {
    const res = new Response("<!doctype html><html>", { status: 200 });
    await expect(readJsonResponseBody(res)).rejects.toThrow(/HTML/);
  });
});
