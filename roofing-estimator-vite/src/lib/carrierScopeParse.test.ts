import { describe, expect, it } from "vitest";
import { parseCarrierScope } from "./carrierScopeParse";

describe("parseCarrierScope", () => {
  it("returns empty parse for blank input", () => {
    expect(parseCarrierScope("")).toMatchObject({
      valuationBasis: "line-total",
      total: 0,
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

  it("extracts leading Xactimate-style codes", () => {
    const p = parseCarrierScope("RFG SHGL 25 SQ 95.00 2375.00");
    expect(p.lineCodes.some((c) => c.includes("RFG"))).toBe(true);
  });
});
