import { describe, expect, it } from "vitest";
import { dataUrlToBase64Payload } from "./fieldPhotoCompress";

describe("dataUrlToBase64Payload", () => {
  it("splits jpeg data URL", () => {
    const { mimeType, base64 } = dataUrlToBase64Payload("data:image/jpeg;base64,abcd");
    expect(mimeType).toBe("image/jpeg");
    expect(base64).toBe("abcd");
  });

  it("throws on invalid input", () => {
    expect(() => dataUrlToBase64Payload("not-a-data-url")).toThrow(/Not a data URL/);
  });
});
