export type ParserConfidence = "low" | "medium" | "high";
export type ValuationBasis = "RCV" | "ACV" | "line-total";

export interface CarrierParsed {
  valuationBasis: ValuationBasis;
  /** Comparison total: labeled RCV/ACV when present, else summed line extensions. */
  total: number;
  rcv: number | null;
  acv: number | null;
  dep: number | null;
  /** Sum of parsed priced-line extensions only (ignores labeled RCV/ACV row). */
  lineExtensionSum: number;
  /** Parsed “Supplement … RCV/Total” style figures from pasted carrier scope. */
  supplementAmounts: number[];
  supplementLabeledTotal: number | null;
  deductibleFromCarrier: number | null;
  netClaimFromCarrier: number | null;
  parsedLineCount: number;
  parserConfidence: ParserConfidence;
  lineMathMismatchCount: number;
  lineMathTotal: number;
  lineCodes: string[];
  likelyMissingItems: string[];
}

/** Xactimate often omits a space before the unit (e.g. `27.10SQ`). */
export function normalizeCarrierScopeLine(line: string): string {
  return line.replace(/\b(\d+(?:\.\d+)?)(SQ|LF|SF|EA|HR|DA)\b/gi, "$1 $2");
}

function collectSupplementAmounts(text: string, into: number[], seen: Set<number>): void {
  const push = (raw: string | undefined) => {
    if (!raw) return;
    const n = Number.parseFloat(raw.replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 25) {
      const r = Math.round(n);
      if (!seen.has(r)) {
        seen.add(r);
        into.push(r);
      }
    }
  };
  const patterns = [
    /\bSupplement\s*(?:#\s*\d+)?[^\d\n$]{0,48}\$?\s*([\d,]+(?:\.\d{1,2})?)/gi,
    /\bSupplement\s+(?:#\s*)?\d+\s+[^\d\n$]{0,40}\$?\s*([\d,]+(?:\.\d{1,2})?)/gi,
    /\bSuppl\.(?:\s*)#\s*\d+\s*[^\d\n$]{0,40}\$?\s*([\d,]+(?:\.\d{1,2})?)/gi,
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      push(m[1]);
    }
  }
}

export function parseCarrierScope(text: string): CarrierParsed {
  if (!text.trim()) {
    return {
      valuationBasis: "line-total",
      total: 0,
      rcv: null,
      acv: null,
      dep: null,
      supplementAmounts: [],
      supplementLabeledTotal: null,
      deductibleFromCarrier: null,
      netClaimFromCarrier: null,
      parsedLineCount: 0,
      parserConfidence: "low",
      lineMathMismatchCount: 0,
      lineMathTotal: 0,
      lineExtensionSum: 0,
      lineCodes: [],
      likelyMissingItems: [],
    };
  }

  const lines = text.split("\n").map((x) => x.trim()).filter(Boolean);
  const getLabel = (rx: RegExp): number | null => {
    const hits = [...text.matchAll(rx)];
    if (!hits.length) return null;
    const raw = hits[hits.length - 1]?.[1];
    if (!raw) return null;
    const n = Number.parseFloat(raw.replace(/,/g, ""));
    return Number.isFinite(n) ? Math.round(n) : null;
  };

  const rcv = getLabel(/(?:\bRCV\b|Replacement\s+Cost(?:\s+Value)?)\D*([\d,]+(?:\.\d{1,2})?)/gi);
  const acv = getLabel(/(?:\bACV\b|Actual\s+Cash\s+Value)\D*([\d,]+(?:\.\d{1,2})?)/gi);
  const dep = getLabel(/(?:\bDep(?:reciation)?\b)\D*([\d,]+(?:\.\d{1,2})?)/gi);
  const deductibleFromCarrier = getLabel(
    /(?:\bDed(?:uctible)?\b|Policy\s+Ded(?:uctible)?)\D*([\d,]+(?:\.\d{1,2})?)/gi,
  );
  const netClaimFromCarrier = getLabel(
    /(?:Net\s+Claim|Claim\s+Payment|Payment\s+from\s+(?:Carrier|Insurance)|Insurance\s+Payment|Total\s+Paid\s+to\s+Insured)\D*([\d,]+(?:\.\d{1,2})?)/gi,
  );
  const supplementLabeledTotal = getLabel(
    /(?:\bSupplement\b|\bSuppl\.?\b)\s*(?:RCV|Gross|Total|Amount)\D*([\d,]+(?:\.\d{1,2})?)/gi,
  );

  const supplementAmounts: number[] = [];
  const seenSupp = new Set<number>();
  collectSupplementAmounts(text, supplementAmounts, seenSupp);

  let parsedLineCount = 0;
  let total = 0;
  let lineMathTotal = 0;
  let mismatch = 0;
  const codes = new Set<string>();
  let lineText = "";

  for (const line of lines) {
    const normLine = normalizeCarrierScopeLine(line);
    lineText += ` ${line.toLowerCase()}`;
    const leadXact = normLine.match(/^([A-Z]{2,4}(?:\s+[A-Z][A-Z0-9]{1,6}){0,3})\s+/);
    if (leadXact?.[1]) {
      codes.add(leadXact[1].replace(/\s+/g, " ").trim());
    } else {
      const code = normLine.match(/\b([A-Z]{2,4}\s?[A-Z0-9]{2,6})\b/)?.[1];
      if (code) codes.add(code.replace(/\s+/g, " "));
    }

    // Skip carrier summary / valuation lines so we do not double-count RCV/ACV into line-item totals.
    const hasXactimateQty = /\d+(?:\.\d+)?\s+(?:SQ|LF|SF|EA|HR|DA)\s+\d+(?:\.\d+)/i.test(normLine);
    if (!hasXactimateQty) {
      if (/(?:^|\s)(?:RCV|ACV|Depreciation|Deductible|Net\s+Claim)\s*[:#]?\s*\$?[\d,]/i.test(normLine)) {
        continue;
      }
      if (/\bSupplement\b/i.test(normLine) && /\$?[\d,]+(?:\.\d{1,2})?/.test(normLine)) {
        continue;
      }
      if (/\b(total|grand total|subtotal|replacement cost value|actual cash value)\b/i.test(normLine)) {
        continue;
      }
    } else if (/\b(total|grand total|subtotal)\b/i.test(normLine)) {
      continue;
    }

    const nums = normLine.replace(/,/g, "").match(/\$?\s*(\d+(?:\.\d{1,2})?)/g) || [];
    if (!nums.length) continue;
    const n = Number.parseFloat(nums[nums.length - 1]!.replace(/[$\s]/g, ""));
    if (!Number.isFinite(n)) continue;

    parsedLineCount += 1;
    total += n;

    const flat = normLine.replace(/,/g, "");
    const qTrail = flat.match(/(\d+(?:\.\d+)?)\s*(SQ|LF|SF|EA|HR|DA)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*$/i);
    if (qTrail?.[1] && qTrail[3] && qTrail[4]) {
      const qty = Number.parseFloat(qTrail[1]);
      const unitPrice = Number.parseFloat(qTrail[3]);
      const ext = Number.parseFloat(qTrail[4]);
      if (Number.isFinite(qty) && Number.isFinite(unitPrice) && Number.isFinite(ext)) {
        const derived = qty * unitPrice;
        lineMathTotal += derived;
        if (
          Math.abs(derived - n) > Math.max(3, n * 0.04) &&
          Math.abs(ext - n) > Math.max(3, n * 0.04)
        ) {
          mismatch += 1;
        }
      }
    } else {
      const q = flat.match(/(\d+(?:\.\d+)?)\s*(SQ|LF|SF|EA)\s+(\d+(?:\.\d{1,2})?)/i);
      if (q?.[1] && q[3]) {
        const qty = Number.parseFloat(q[1]);
        const unitPrice = Number.parseFloat(q[3]);
        if (Number.isFinite(qty) && Number.isFinite(unitPrice)) {
          const derived = qty * unitPrice;
          lineMathTotal += derived;
          if (Math.abs(derived - n) > Math.max(3, n * 0.04)) mismatch += 1;
        }
      } else {
        lineMathTotal += n;
      }
    }
  }

  let parserConfidence: ParserConfidence = "low";
  if (parsedLineCount >= 3) parserConfidence = "medium";
  if (parsedLineCount >= 5 && mismatch <= Math.max(1, Math.floor(parsedLineCount * 0.2))) {
    parserConfidence = "high";
  }

  const valuationBasis: ValuationBasis = rcv != null ? "RCV" : acv != null ? "ACV" : "line-total";
  const lineExtensionSum = Math.round(total);
  const parsedTotal = valuationBasis === "RCV" ? rcv! : valuationBasis === "ACV" ? acv! : lineExtensionSum;

  const missing: string[] = [];
  const addMissing = (rx: RegExp, label: string) => {
    if (!rx.test(lineText)) missing.push(label);
  };
  addMissing(/tear|remove|demo|disposal|tear off/i, "Tear-off and disposal");
  addMissing(/drip edge|edge metal|rfg drpe/i, "Drip edge / edge metal");
  addMissing(/flashing|step flashing|counter flashing|fls step|fls pj/i, "Flashing upgrades");
  addMissing(/ridge vent|ventilation|soffit|rdgv/i, "Ventilation line items");
  addMissing(/starter|strt|eaves/i, "Starter course at eaves/rakes");
  addMissing(/ice\s*&?\s*water|self-adhered|icws|rfg icw/i, "Ice and water shield");
  addMissing(/synthetic|underlay|unsy/i, "Synthetic underlayment");
  addMissing(/overhead|profit|o&p|supervision|storage/i, "Overhead, profit, or staging");

  return {
    valuationBasis,
    total: parsedTotal,
    rcv,
    acv,
    dep,
    lineExtensionSum,
    supplementAmounts,
    supplementLabeledTotal,
    deductibleFromCarrier,
    netClaimFromCarrier,
    parsedLineCount,
    parserConfidence,
    lineMathMismatchCount: mismatch,
    lineMathTotal: Math.round(lineMathTotal),
    lineCodes: Array.from(codes).slice(0, 12),
    likelyMissingItems: missing.slice(0, 5),
  };
}
