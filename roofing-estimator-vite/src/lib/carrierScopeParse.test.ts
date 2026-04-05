import { describe, expect, it } from "vitest";
import { normalizeCarrierScopeLine, parseCarrierScope } from "./carrierScopeParse";

describe("normalizeCarrierScopeLine", () => {
  it("inserts space between quantity and unit when glued", () => {
    expect(normalizeCarrierScopeLine("RFG 240SQ 120.00 28800.00")).toBe("RFG 240 SQ 120.00 28800.00");
  });
});

describe("parseCarrierScope", () => {
  it("returns empty parse for blank input", () => {
    expect(parseCarrierScope("")).toMatchObject({
      valuationBasis: "line-total",
      total: 0,
      lineExtensionSum: 0,
      parsedLineCount: 0,
      parserConfidence: "low",
      lineCodes: [],
    });
  });

  it("prefers RCV as valuation basis when labeled", () => {
    const text = `
RCV: $12,450.50
ACV: 8,000
RFG TEAR 12.5 SQ 85.00 1062.50
RFG 240SQ 120.00 28800.00
RFG DRPE 180 LF 4.50 810.00
`;
    const p = parseCarrierScope(text);
    expect(p.valuationBasis).toBe("RCV");
    expect(p.rcv).toBe(12451);
    expect(p.acv).toBe(8000);
    expect(p.parsedLineCount).toBeGreaterThanOrEqual(3);
  });

  it("uses ACV when no RCV label", () => {
    const p = parseCarrierScope("Actual Cash Value: 5,200\nSome line 100");
    expect(p.valuationBasis).toBe("ACV");
    expect(p.total).toBe(5200);
  });

  it("collects supplement dollar amounts", () => {
    const p = parseCarrierScope(
      "Supplement #1 paid $1,250.00\nSupplement #2 amount $ 900.00",
    );
    expect(p.supplementAmounts).toEqual(expect.arrayContaining([1250, 900]));
  });

  it("parses Supplement N $amount without hash", () => {
    const p = parseCarrierScope("Supplement 2 $ 900");
    expect(p.supplementAmounts).toContain(900);
  });

  it("parses glued SQ quantity lines", () => {
    const p = parseCarrierScope("RFG 240SQ 120.00 28800.00");
    expect(p.parsedLineCount).toBeGreaterThanOrEqual(1);
    expect(p.lineExtensionSum).toBeGreaterThan(1000);
  });

  it("exposes lineExtensionSum alongside labeled RCV", () => {
    const p = parseCarrierScope(
      "RFG X 10 SQ 100 1000\nRCV: 50000",
    );
    expect(p.valuationBasis).toBe("RCV");
    expect(p.total).toBe(50000);
    expect(p.lineExtensionSum).toBe(1000);
  });

  it("extracts leading Xactimate-style codes", () => {
    const p = parseCarrierScope("RFG SHGL 25 SQ 95.00 2375.00");
    expect(p.lineCodes.some((c) => c.includes("RFG"))).toBe(true);
  });
});
