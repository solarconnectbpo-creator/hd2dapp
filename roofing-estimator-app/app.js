const STATE_MULT = {
  AK: 1.34, CA: 1.28, CO: 1.09, CT: 1.12, DC: 1.2, FL: 1.03, HI: 1.36,
  MA: 1.16, MD: 1.1, NJ: 1.16, NY: 1.2, OR: 1.07, WA: 1.12, TX: 0.96, MO: 0.94,
};

const byId = (id) => document.getElementById(id);
const severityEl = byId("severity");
const severityValueEl = byId("severityValue");
severityEl.addEventListener("input", () => {
  severityValueEl.textContent = severityEl.value;
});

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function fmt(n) {
  return `$${Math.round(n).toLocaleString()}`;
}

function parsePitchRise(p) {
  if (!p) return null;
  const m = String(p).trim().replace(":", "/").match(/^(\d+(?:\.\d+)?)\s*\/\s*12$/);
  return m ? Number(m[1]) : null;
}

function classifyRoofType(rt) {
  const t = (rt || "").toLowerCase();
  if (t.includes("slate")) return "slate";
  if (t.includes("metal")) return "metal";
  if (t.includes("tile")) return "tile";
  if (t.includes("tpo")) return "tpo";
  if (t.includes("epdm")) return "epdm";
  if (t.includes("pvc")) return "pvc";
  if (t.includes("modified")) return "modbit";
  if (t.includes("coating")) return "coating";
  if (t.includes("flat")) return "flat";
  return "asphalt";
}

function getBaseRates(cat) {
  const map = {
    slate: [1700, 2600, 2800, 3100],
    metal: [1600, 2500, 2600, 3400],
    tile: [1500, 2400, 2500, 3400],
    tpo: [350, 520, 520, 760],
    epdm: [340, 500, 500, 730],
    pvc: [360, 530, 530, 770],
    modbit: [390, 570, 570, 820],
    coating: [240, 360, 360, 520],
    flat: [1300, 2200, 2200, 3000],
    asphalt: [1200, 2000, 2100, 2900],
  };
  return map[cat] || map.asphalt;
}

function computeEstimate(input) {
  const area = input.areaSqFt;
  const waste = 0.12;
  const effSq = (area * (1 + waste)) / 100;
  const cat = classifyRoofType(input.roofType);
  const [repairLow, repairHigh, replaceLow, replaceHigh] = getBaseRates(cat);

  const hasReplaceSignal =
    input.damageTypes.includes("Missing Shingles") ||
    input.damageTypes.includes("Structural");
  const scope = input.severity >= 4 || hasReplaceSignal ? "replace" : "repair";
  const [baseLow, baseHigh] =
    scope === "replace" ? [replaceLow, replaceHigh] : [repairLow, repairHigh];

  const mix = 1 + clamp((input.damageTypes.length - 1) * 0.08, 0, 0.35);
  const sev = 0.92 + input.severity * 0.07;
  const reg = clamp(input.regionalMultiplier || 1, 0.75, 1.45);

  const low = Math.round(effSq * baseLow * mix * sev * reg);
  const high = Math.round(effSq * baseHigh * mix * sev * reg);

  let confidence = "medium";
  if (input.damageTypes.length >= 2 && input.severity >= 4) confidence = "high";
  if (input.damageTypes.length <= 1 && input.severity <= 2) confidence = "low";

  return {
    scope,
    low,
    high,
    confidence,
    effectiveSquares: Number(effSq.toFixed(2)),
    wastePct: 12,
    regionalMultiplier: reg,
  };
}

function assessMeasurementQuality(input) {
  let score = 100;
  const warnings = [];
  if (input.areaSqFt < 350 || input.areaSqFt > 25000) {
    score -= 18;
    warnings.push("Area outside typical single-structure range.");
  }
  if (!input.perimeterFt) {
    score -= 10;
    warnings.push("Perimeter missing; accessory confidence reduced.");
  } else {
    const compactness = (input.perimeterFt * input.perimeterFt) / Math.max(1, input.areaSqFt);
    if (compactness < 10 || compactness > 60) {
      score -= 16;
      warnings.push("Area/perimeter ratio unusual; verify geometry.");
    }
  }
  const rise = parsePitchRise(input.roofPitch);
  if (rise == null) {
    score -= 8;
    warnings.push("Pitch missing; slope assumptions may affect estimate.");
  } else if (rise < 1 || rise > 14) {
    score -= 12;
    warnings.push("Pitch appears atypical.");
  }
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    score -= 8;
    warnings.push("Coordinates missing; map context reduced.");
  }
  return { score: clamp(score, 35, 100), warnings };
}

function parseCarrier(text) {
  if (!text || !text.trim()) {
    return {
      parsedLineCount: 0,
      total: 0,
      valuationBasis: "line-total",
      rcv: null,
      acv: null,
      dep: null,
      parserConfidence: "low",
      lineMathMismatchCount: 0,
      lineMathTotal: 0,
      lineCodes: [],
      likelyMissingItems: [],
    };
  }
  const lines = text.split("\n").map((x) => x.trim()).filter(Boolean);
  const getLabelTotal = (rx) => {
    const hits = [...text.matchAll(rx)];
    if (!hits.length) return null;
    const raw = hits[hits.length - 1][1];
    const n = Number(String(raw).replace(/,/g, ""));
    return Number.isFinite(n) ? Math.round(n) : null;
  };
  const rcv = getLabelTotal(/(?:\bRCV\b|Replacement\s+Cost(?:\s+Value)?)\D*([\d,]+(?:\.\d{1,2})?)/gi);
  const acv = getLabelTotal(/(?:\bACV\b|Actual\s+Cash\s+Value)\D*([\d,]+(?:\.\d{1,2})?)/gi);
  const dep = getLabelTotal(/(?:\bDep(?:reciation)?\b)\D*([\d,]+(?:\.\d{1,2})?)/gi);

  let total = 0;
  let lineMathTotal = 0;
  let parsedLineCount = 0;
  let mismatch = 0;
  const codeSet = new Set();
  let allText = "";

  for (const line of lines) {
    allText += " " + line.toLowerCase();
    const cm = line.match(/\b([A-Z]{2,4}\s?[A-Z0-9]{2,6})\b/);
    if (cm && cm[1]) codeSet.add(cm[1].replace(/\s+/g, ""));
    if (/\b(total|grand total|subtotal|replacement cost|actual cash value|depreciation)\b/i.test(line)) {
      continue;
    }
    const nums = line.replace(/,/g, "").match(/\$?\s*(\d+(?:\.\d{1,2})?)/g) || [];
    if (!nums.length) continue;
    const n = Number(nums[nums.length - 1].replace(/[$\s]/g, ""));
    if (!Number.isFinite(n)) continue;
    total += n;
    parsedLineCount += 1;

    const q = line.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(SQ|LF|SF|EA)\s+(\d+(?:\.\d{1,2})?)/i);
    if (q) {
      const qty = Number(q[1]);
      const up = Number(q[3]);
      if (Number.isFinite(qty) && Number.isFinite(up)) {
        const derived = qty * up;
        lineMathTotal += derived;
        if (Math.abs(derived - n) > Math.max(3, n * 0.04)) mismatch += 1;
      }
    } else {
      lineMathTotal += n;
    }
  }

  let parserConfidence = "low";
  if (parsedLineCount >= 3) parserConfidence = "medium";
  if (parsedLineCount >= 5 && mismatch <= Math.max(1, Math.floor(parsedLineCount * 0.2))) {
    parserConfidence = "high";
  }

  const valuationBasis = rcv != null ? "RCV" : acv != null ? "ACV" : "line-total";
  const parsedCarrierTotalUsd = valuationBasis === "RCV" ? rcv : valuationBasis === "ACV" ? acv : Math.round(total);
  const missing = [];
  const addMiss = (rx, label) => { if (!rx.test(allText)) missing.push(label); };
  addMiss(/tear|remove|demo|disposal/, "Tear-off and disposal");
  addMiss(/drip edge|edge metal/, "Drip edge / edge metal");
  addMiss(/flashing|step flashing|counter flashing/, "Flashing upgrades");
  addMiss(/ridge vent|ventilation|soffit/, "Ventilation line items");
  addMiss(/ice|water shield|self-adhered/, "Ice and water shield");
  addMiss(/overhead|profit|o&p|supervision/, "Overhead and profit");

  return {
    parsedLineCount,
    total: parsedCarrierTotalUsd || 0,
    valuationBasis,
    rcv,
    acv,
    dep,
    parserConfidence,
    lineMathMismatchCount: mismatch,
    lineMathTotal: Math.round(lineMathTotal),
    lineCodes: [...codeSet].slice(0, 12),
    likelyMissingItems: missing.slice(0, 5),
  };
}

function settlementProjection(carrier, estimateMid, deductible, nonRecDep) {
  const d = Math.max(0, Math.round(deductible || 0));
  const dep = Math.max(
    0,
    carrier.dep != null
      ? carrier.dep
      : carrier.rcv != null && carrier.acv != null
      ? carrier.rcv - carrier.acv
      : 0,
  );
  const nonRec = Math.max(0, Math.min(Math.round(nonRecDep || 0), dep));
  const recov = Math.max(0, dep - nonRec);
  const acvBase = carrier.acv != null ? carrier.acv : Math.max(0, carrier.total - dep);
  const initial = Math.max(0, acvBase - d);
  const finalPay = initial + recov;
  const oop = Math.max(0, Math.round(estimateMid - finalPay));
  return {
    deductibleUsd: d,
    depreciationUsd: dep,
    nonRecoverableDepreciationUsd: nonRec,
    recoverableDepreciationUsd: recov,
    initialPaymentUsd: Math.round(initial),
    projectedFinalPaymentUsd: Math.round(finalPay),
    estimatedOutOfPocketUsd: oop,
  };
}

function readForm() {
  const damageTypes = [...document.querySelectorAll(".damage:checked")].map(
    (el) => el.value,
  );
  return {
    address: byId("address").value.trim(),
    stateCode: byId("stateCode").value.trim().toUpperCase(),
    lat: Number(byId("lat").value),
    lng: Number(byId("lng").value),
    roofType: byId("roofType").value,
    areaSqFt: Number(byId("areaSqFt").value),
    perimeterFt: Number(byId("perimeterFt").value) || null,
    roofPitch: byId("roofPitch").value.trim(),
    severity: Number(byId("severity").value),
    damageTypes: damageTypes.length ? damageTypes : ["Wind", "Leaks"],
    carrierScopeText: byId("carrierScopeText").value,
    deductibleUsd: Number(byId("deductibleUsd").value) || 0,
    nonRecDepUsd: Number(byId("nonRecDepUsd").value) || 0,
  };
}

function render(result) {
  const el = byId("results");
  el.innerHTML = `
    <div class="result-grid">
      <div class="tile"><strong>Scope</strong><div>${result.estimate.scope.toUpperCase()}</div></div>
      <div class="tile"><strong>Estimate Range</strong><div>${fmt(result.estimate.low)} - ${fmt(result.estimate.high)}</div></div>
      <div class="tile"><strong>Confidence</strong><div>${result.estimate.confidence}</div></div>
      <div class="tile"><strong>Effective Squares</strong><div>${result.estimate.effectiveSquares}</div></div>
      <div class="tile"><strong>Regional Multiplier</strong><div>x${result.estimate.regionalMultiplier.toFixed(2)}</div></div>
      <div class="tile"><strong>Measurement Score</strong><div>${result.measurement.score}/100</div></div>
    </div>

    <h3>Carrier Comparison</h3>
    <div class="result-grid">
      <div class="tile"><strong>Valuation Basis</strong><div>${result.carrier.valuationBasis}</div></div>
      <div class="tile"><strong>Carrier Total</strong><div>${fmt(result.carrier.total)}</div></div>
      <div class="tile"><strong>Estimator Midpoint</strong><div>${fmt(result.estimateMid)}</div></div>
      <div class="tile"><strong>Delta</strong><div>${fmt(result.delta)} (${result.deltaDirection})</div></div>
      <div class="tile"><strong>Parser Confidence</strong><div>${result.carrier.parserConfidence}</div></div>
      <div class="tile"><strong>Line Math Mismatches</strong><div>${result.carrier.lineMathMismatchCount}</div></div>
    </div>

    <h3>Settlement Projection</h3>
    <div class="result-grid">
      <div class="tile"><strong>Deductible</strong><div>${fmt(result.settlement.deductibleUsd)}</div></div>
      <div class="tile"><strong>Recoverable Depreciation</strong><div>${fmt(result.settlement.recoverableDepreciationUsd)}</div></div>
      <div class="tile"><strong>Initial ACV Payment</strong><div>${fmt(result.settlement.initialPaymentUsd)}</div></div>
      <div class="tile"><strong>Projected Final Payment</strong><div>${fmt(result.settlement.projectedFinalPaymentUsd)}</div></div>
      <div class="tile"><strong>Estimated Out-of-Pocket</strong><div>${fmt(result.settlement.estimatedOutOfPocketUsd)}</div></div>
      <div class="tile"><strong>Carrier RCV / ACV / Dep</strong><div>${result.carrier.rcv ? fmt(result.carrier.rcv) : "N/A"} / ${result.carrier.acv ? fmt(result.carrier.acv) : "N/A"} / ${result.carrier.dep ? fmt(result.carrier.dep) : "N/A"}</div></div>
    </div>

    <h3>Warnings & Missing Scope</h3>
    <ul>
      ${result.measurement.warnings.map((w) => `<li>${w}</li>`).join("") || "<li class='muted'>No measurement warnings.</li>"}
      ${result.carrier.likelyMissingItems.map((w) => `<li>${w}</li>`).join("") || "<li class='muted'>No likely missing scope flags.</li>"}
    </ul>
  `;
}

byId("runEstimate").addEventListener("click", () => {
  const input = readForm();
  if (!Number.isFinite(input.areaSqFt) || input.areaSqFt <= 0) {
    alert("Enter a valid plan area (sq ft).");
    return;
  }
  const regionalMultiplier = STATE_MULT[input.stateCode] || 1;
  const estimate = computeEstimate({ ...input, regionalMultiplier });
  const measurement = assessMeasurementQuality(input);
  const carrier = parseCarrier(input.carrierScopeText);
  const estimateMid = Math.round((estimate.low + estimate.high) / 2);
  const delta = estimateMid - carrier.total;
  const deltaDirection = delta > 1500 ? "under-scoped" : delta < -1500 ? "over-scoped" : "aligned";
  const settlement = settlementProjection(
    carrier,
    estimateMid,
    input.deductibleUsd,
    input.nonRecDepUsd,
  );
  render({ estimate, measurement, carrier, settlement, estimateMid, delta, deltaDirection });
});

