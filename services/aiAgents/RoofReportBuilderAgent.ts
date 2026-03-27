import OpenAIService, { type OpenAIResponse } from "./OpenAIService";
import { computeRoofDamageEstimate } from "../../src/roofReports/roofEstimate";
import { parseRoofPitchRise } from "../../src/roofReports/roofEstimateCodeUpgrades";
import { buildRoofMeasurementGuidanceNotes } from "../../src/roofReports/roofMeasurementGuidance";
import { getRegionalCostMultiplier } from "../../src/roofReports/regionalCostMultiplier";
import type {
  DamageType,
  RecommendedAction,
  RoofDamageEstimate,
  Severity,
} from "../../src/roofReports/roofReportTypes";
import { classifyRoofSystem } from "../../src/roofReports/roofSystemScope";

export interface RoofInspectionData {
  address: string;
  latitude?: number;
  longitude?: number;
  roofAge: number;
  roofType: string;
  squareFootage: number;
  roofPerimeterFt?: number;
  roofPitch?: string;
  stateCode?: string;
  carrierScopeText?: string;
  deductibleUsd?: number;
  nonRecoverableDepreciationUsd?: number;
  visibleIssues: string[];
  photoData?: string;
  notes?: string;
}

export interface RoofReport {
  id: string;
  generatedAt: string;
  address: string;
  executiveSummary: string;
  condition: {
    overall: string;
    material: string;
    age: number;
  };
  issues: {
    identified: string[];
    severity: string[];
    priorityOrder: string[];
  };
  recommendations: {
    repairs: string[];
    maintenance: string[];
    preventative: string[];
  };
  costEstimate: {
    lowRange: string;
    highRange: string;
    urgency: string;
    scope?: string;
    confidence?: string;
    basis?: string;
    lineItems?: string[];
    codeUpgrades?: string[];
    auditSummary?: string;
    recoveryDeltaRange?: string;
    auditFindings?: string[];
    auditTimeline?: string[];
  };
  maintenanceSchedule: {
    monthly: string[];
    seasonal: string[];
    annual: string[];
  };
  measurements: {
    areaSqFt: number;
    perimeterFt?: number;
    pitch?: string;
    effectiveSquares?: number;
    wasteFactorPct?: number;
    guidance?: string[];
    roofSystemCategory?: string;
    latitude?: number;
    longitude?: number;
    qualityScore?: number;
    qualityWarnings?: string[];
  };
  carrierComparison?: {
    carrierItemsCount: number;
    parsedCarrierTotalUsd: number;
    parsedRcvUsd?: number;
    parsedAcvUsd?: number;
    parsedDepreciationUsd?: number;
    valuationBasis: "RCV" | "ACV" | "line-total";
    detectedLineCodes: string[];
    parserConfidence: "low" | "medium" | "high";
    lineMathMismatchCount: number;
    parsedFromLineMathTotalUsd: number;
    settlementProjection?: {
      deductibleUsd: number;
      depreciationUsd: number;
      nonRecoverableDepreciationUsd: number;
      recoverableDepreciationUsd: number;
      initialPaymentUsd: number;
      projectedFinalPaymentUsd: number;
      estimatedOutOfPocketUsd: number;
    };
    estimatedMidUsd: number;
    deltaUsd: number;
    deltaDirection: "under-scoped" | "over-scoped" | "aligned";
    likelyMissingItems: string[];
    note?: string;
  };
  photos: {
    url: string;
    caption: string;
  }[];
}

class RoofReportBuilderAgent {
  private openaiService: OpenAIService;

  constructor() {
    this.openaiService = new OpenAIService();
  }

  private assertChat(
    res: OpenAIResponse,
    step: string,
  ): asserts res is OpenAIResponse & { message: string } {
    if (!res.success || res.message == null) {
      throw new Error(res.error ?? `${step} failed`);
    }
  }

  /**
   * Build comprehensive roof report
   */
  async buildRoofReport(
    data: RoofInspectionData,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<RoofReport> {
    const reportId = `roof-${Date.now()}`;

    if (onProgress) onProgress(10, "Analyzing roof condition...");

    const conditionAnalysis = await this.openaiService.chat(
      `Based on this roof inspection data:
        - Age: ${data.roofAge} years
        - Type: ${data.roofType}
        - Square footage: ${data.squareFootage}
        - Visible issues: ${data.visibleIssues.join(", ")}
        - Notes: ${data.notes || "None"}

        Provide a brief condition assessment.`,
      "You are a roof inspection expert.",
    );
    this.assertChat(conditionAnalysis, "Condition analysis");

    if (onProgress) onProgress(30, "Identifying issues and severity levels...");

    const issuesAnalysis = await this.openaiService.chat(
      `List the roofing issues in priority order with severity levels (Critical/High/Medium/Low)`,
      "You are a roof inspection expert analyzing the issues mentioned earlier.",
    );
    this.assertChat(issuesAnalysis, "Issues analysis");

    if (onProgress) onProgress(50, "Generating recommendations...");

    const recommendations = await this.openaiService.chat(
      `Provide specific repair, maintenance, and preventative recommendations for this roof.`,
      "You are a roof repair specialist.",
    );
    this.assertChat(recommendations, "Recommendations");

    if (onProgress) onProgress(70, "Calculating cost estimates...");
    const issueText = data.visibleIssues.join(" ").toLowerCase();
    const damageTypes = this.mapIssuesToDamageTypes(data.visibleIssues);
    const severity = this.deriveSeverity(data.roofAge, issueText, damageTypes);
    const recommendedAction = this.deriveRecommendedAction(
      data.roofAge,
      severity,
      damageTypes,
    );
    const regionalMultiplier = getRegionalCostMultiplier(data.stateCode);
    const estimate = computeRoofDamageEstimate({
      roofAreaSqFt: data.squareFootage,
      roofType: data.roofType,
      damageTypes,
      severity,
      notes: data.notes,
      recommendedAction,
      roofPitch: data.roofPitch,
      stateCode: data.stateCode,
      regionalCostMultiplier: regionalMultiplier,
    });
    const claimAudit = this.buildClaimAudit(estimate);
    const carrierComparison = this.buildCarrierComparison(
      estimate,
      data.carrierScopeText,
      data.deductibleUsd,
      data.nonRecoverableDepreciationUsd,
    );
    const { category } = classifyRoofSystem(data.roofType);
    const guidance = buildRoofMeasurementGuidanceNotes({
      roofAreaSqFt: data.squareFootage,
      roofPerimeterFt: data.roofPerimeterFt,
      roofSystemCategory: category,
      pitchRise: parseRoofPitchRise(data.roofPitch),
    });
    const measurementQuality = this.assessMeasurementQuality({
      roofAreaSqFt: data.squareFootage,
      roofPerimeterFt: data.roofPerimeterFt,
      roofPitch: data.roofPitch,
      lat: data.latitude,
      lng: data.longitude,
    });

    if (onProgress) onProgress(85, "Creating maintenance schedule...");

    const maintenanceSchedule = await this.openaiService.chat(
      `Create a maintenance schedule (monthly, seasonal, annual tasks) for maintaining this roof.`,
      "You are a roof maintenance expert.",
    );
    this.assertChat(maintenanceSchedule, "Maintenance schedule");

    if (onProgress) onProgress(100, "Report complete!");

    return {
      id: reportId,
      generatedAt: new Date().toISOString(),
      address: data.address,
      executiveSummary: this.extractSummary(conditionAnalysis),
      condition: {
        overall: this.extractCondition(conditionAnalysis),
        material: data.roofType,
        age: data.roofAge,
      },
      issues: {
        identified: data.visibleIssues,
        severity: this.extractSeverities(issuesAnalysis),
        priorityOrder: this.extractPriorities(issuesAnalysis),
      },
      recommendations: {
        repairs: this.extractRepairs(recommendations),
        maintenance: this.extractMaintenance(recommendations),
        preventative: this.extractPreventative(recommendations),
      },
      costEstimate: {
        lowRange: this.formatCurrency(estimate.lowCostUsd),
        highRange: this.formatCurrency(estimate.highCostUsd),
        urgency: this.estimateUrgency(severity, recommendedAction),
        scope: estimate.scope,
        confidence: estimate.confidence,
        basis: estimate.methodology,
        lineItems: estimate.lineItems
          ?.slice(0, 6)
          .map(
            (line) =>
              `${line.description}: ${this.formatCurrency(line.lowUsd)} - ${this.formatCurrency(line.highUsd)}`,
          ),
        codeUpgrades: estimate.codeUpgrades?.map(
          (item) =>
            `${item.title}${item.codeReference ? ` (${item.codeReference})` : ""}`,
        ),
        auditSummary: claimAudit.summary,
        recoveryDeltaRange: this.formatCurrencyRange(
          claimAudit.recoveryDeltaLowUsd,
          claimAudit.recoveryDeltaHighUsd,
        ),
        auditFindings: claimAudit.findings,
        auditTimeline: claimAudit.timeline,
      },
      maintenanceSchedule: {
        monthly: this.extractMonthly(maintenanceSchedule),
        seasonal: this.extractSeasonal(maintenanceSchedule),
        annual: this.extractAnnual(maintenanceSchedule),
      },
      measurements: {
        areaSqFt: data.squareFootage,
        perimeterFt: data.roofPerimeterFt,
        pitch: data.roofPitch,
        effectiveSquares: estimate.effectiveSquares,
        wasteFactorPct: estimate.wasteFactorPct,
        guidance: guidance
          ?.split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0),
        roofSystemCategory: category,
        latitude: data.latitude,
        longitude: data.longitude,
        qualityScore: measurementQuality.score,
        qualityWarnings: measurementQuality.warnings,
      },
      carrierComparison,
      photos: data.photoData
        ? [
            {
              url: data.photoData,
              caption: `Roof inspection photo - ${data.address}`,
            },
          ]
        : [],
    };
  }

  private mapIssuesToDamageTypes(issues: string[]): DamageType[] {
    const text = issues.join(" ").toLowerCase();
    const detected = new Set<DamageType>();

    if (/hail|impact|dented|bruise/.test(text)) detected.add("Hail");
    if (/wind|lifted|blown|torn/.test(text)) detected.add("Wind");
    if (/missing shingle|missing tab|shingle loss/.test(text))
      detected.add("Missing Shingles");
    if (/leak|water|moisture|stain|drip/.test(text)) detected.add("Leaks");
    if (/flashing|chimney flashing|counter flashing/.test(text))
      detected.add("Flashing");
    if (/sag|deck|truss|structural|collapse/.test(text))
      detected.add("Structural");

    if (detected.size === 0) {
      detected.add("Wind");
      detected.add("Leaks");
    }
    return Array.from(detected);
  }

  private deriveSeverity(
    roofAge: number,
    issueText: string,
    damageTypes: DamageType[],
  ): Severity {
    let score = 2;
    if (roofAge >= 20) score += 1;
    if (roofAge >= 30) score += 1;
    if (damageTypes.includes("Structural")) score += 2;
    if (damageTypes.includes("Missing Shingles")) score += 1;
    if (damageTypes.includes("Leaks")) score += 1;
    if (/major|severe|widespread|multiple elevations/.test(issueText))
      score += 1;
    return Math.max(1, Math.min(5, score)) as Severity;
  }

  private deriveRecommendedAction(
    roofAge: number,
    severity: Severity,
    damageTypes: DamageType[],
  ): RecommendedAction {
    if (severity >= 4) return "Replace";
    if (roofAge >= 25 && damageTypes.length >= 2) return "Replace";
    if (damageTypes.includes("Structural")) return "Replace";
    return "Repair";
  }

  private estimateUrgency(
    severity: Severity,
    action: RecommendedAction,
  ): string {
    if (action === "Replace" && severity >= 4) return "Urgent";
    if (severity >= 3) return "High";
    return "Routine Maintenance";
  }

  private formatCurrency(amount: number): string {
    return `$${Math.round(amount).toLocaleString()}`;
  }

  private formatCurrencyRange(low: number, high: number): string {
    return `${this.formatCurrency(low)} - ${this.formatCurrency(high)}`;
  }

  private assessMeasurementQuality(opts: {
    roofAreaSqFt: number;
    roofPerimeterFt?: number;
    roofPitch?: string;
    lat?: number;
    lng?: number;
  }): { score: number; warnings: string[] } {
    const warnings: string[] = [];
    let score = 100;

    if (opts.roofAreaSqFt < 350 || opts.roofAreaSqFt > 25000) {
      warnings.push("Area appears outside typical single-structure range.");
      score -= 18;
    }

    if (typeof opts.roofPerimeterFt === "number") {
      const compactness =
        (opts.roofPerimeterFt * opts.roofPerimeterFt) /
        Math.max(1, opts.roofAreaSqFt);
      if (compactness < 10 || compactness > 60) {
        warnings.push(
          "Area/perimeter ratio looks unusual; verify trace geometry for cut-up complexity.",
        );
        score -= 16;
      }
    } else {
      warnings.push(
        "Perimeter not provided; edge-metal and accessory takeoff has lower confidence.",
      );
      score -= 10;
    }

    const rise = parseRoofPitchRise(opts.roofPitch);
    if (rise == null) {
      warnings.push(
        "Pitch not provided; low-slope vs steep-slope assumptions may affect scope and code checks.",
      );
      score -= 8;
    } else if (rise < 1 || rise > 14) {
      warnings.push("Pitch value appears atypical; confirm rise/12 entry.");
      score -= 12;
    }

    if (typeof opts.lat !== "number" || typeof opts.lng !== "number") {
      warnings.push(
        "Map coordinates missing; geospatial context and weather/code alignment are reduced.",
      );
      score -= 8;
    }

    score = Math.max(35, Math.min(100, score));
    return { score, warnings };
  }

  private parseCarrierScopeTotals(scopeText?: string): {
    totalUsd: number;
    rcvUsd?: number;
    acvUsd?: number;
    depreciationUsd?: number;
    parsedLineCount: number;
    descriptions: string[];
    detectedLineCodes: string[];
    parsedFromLineMathTotalUsd: number;
    lineMathMismatchCount: number;
    parserConfidence: "low" | "medium" | "high";
  } {
    if (!scopeText?.trim()) {
      return {
        totalUsd: 0,
        parsedLineCount: 0,
        descriptions: [],
        detectedLineCodes: [],
        parsedFromLineMathTotalUsd: 0,
        lineMathMismatchCount: 0,
        parserConfidence: "low",
      };
    }

    const lines = scopeText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    let total = 0;
    let lineMathTotal = 0;
    let parsedLineCount = 0;
    let lineMathMismatchCount = 0;
    const descriptions: string[] = [];
    const lineCodes = new Set<string>();

    const parseMoney = (text: string): number | null => {
      const cleaned = text.replace(/[$,]/g, "").trim();
      const n = Number.parseFloat(cleaned);
      return Number.isFinite(n) ? n : null;
    };

    const parseLabeledTotal = (
      labelRegex: RegExp,
      text: string,
    ): number | undefined => {
      const hits = [...text.matchAll(labelRegex)];
      if (hits.length === 0) return undefined;
      const last = hits[hits.length - 1];
      const raw = last?.[1];
      if (!raw) return undefined;
      const n = Number.parseFloat(raw.replace(/,/g, ""));
      return Number.isFinite(n) ? Math.round(n) : undefined;
    };

    const rcvUsd = parseLabeledTotal(
      /(?:\bRCV\b|Replacement\s+Cost(?:\s+Value)?)\D*([\d,]+(?:\.\d{1,2})?)/gi,
      scopeText,
    );
    const acvUsd = parseLabeledTotal(
      /(?:\bACV\b|Actual\s+Cash\s+Value)\D*([\d,]+(?:\.\d{1,2})?)/gi,
      scopeText,
    );
    const depreciationUsd = parseLabeledTotal(
      /(?:\bDep(?:reciation)?\b)\D*([\d,]+(?:\.\d{1,2})?)/gi,
      scopeText,
    );

    for (const line of lines) {
      const codeMatch = line.match(/\b([A-Z]{2,4}\s?[A-Z0-9]{2,6})\b/);
      if (codeMatch?.[1]) lineCodes.add(codeMatch[1].replace(/\s+/g, ""));

      // Skip document summary rows when line-item totals are already labeled.
      if (
        /\b(total|grand total|subtotal|replacement cost|actual cash value|depreciation)\b/i.test(
          line,
        )
      ) {
        continue;
      }

      const normalized = line.replace(/,/g, "");
      const matches = normalized.match(/\$?\s*(\d+(?:\.\d{1,2})?)/g) ?? [];
      if (matches.length === 0) continue;

      const last = matches[matches.length - 1];
      if (!last) continue;
      const n = Number.parseFloat(last.replace(/\$|\s/g, ""));
      if (!Number.isFinite(n)) continue;

      total += n;
      parsedLineCount += 1;

      const qtyUnitPrice = normalized.match(
        /(\d+(?:\.\d+)?)\s*(SQ|LF|SF|EA)\s+(\d+(?:\.\d{1,2})?)/i,
      );
      if (qtyUnitPrice) {
        const qty = parseMoney(qtyUnitPrice[1] ?? "");
        const unitPrice = parseMoney(qtyUnitPrice[3] ?? "");
        if (qty != null && unitPrice != null) {
          const derivedTotal = qty * unitPrice;
          lineMathTotal += derivedTotal;
          if (Math.abs(derivedTotal - n) > Math.max(3, n * 0.04)) {
            lineMathMismatchCount += 1;
          }
        }
      } else {
        lineMathTotal += n;
      }

      const desc = line
        .replace(/\$?\s*\d[\d,]*(?:\.\d{1,2})?/g, "")
        .replace(/[-:]+/g, " ")
        .trim();
      descriptions.push(desc || line);
    }

    let parserConfidence: "low" | "medium" | "high" = "low";
    if (parsedLineCount >= 3) parserConfidence = "medium";
    if (
      parsedLineCount >= 5 &&
      lineMathMismatchCount <= Math.max(1, Math.floor(parsedLineCount * 0.2))
    ) {
      parserConfidence = "high";
    }

    return {
      totalUsd: Math.round(total),
      rcvUsd,
      acvUsd,
      depreciationUsd,
      parsedLineCount,
      descriptions,
      detectedLineCodes: Array.from(lineCodes).slice(0, 12),
      parsedFromLineMathTotalUsd: Math.round(lineMathTotal),
      lineMathMismatchCount,
      parserConfidence,
    };
  }

  private buildCarrierComparison(
    estimate: RoofDamageEstimate,
    carrierScopeText?: string,
    deductibleUsd?: number,
    nonRecoverableDepreciationUsd?: number,
  ): RoofReport["carrierComparison"] {
    const parsed = this.parseCarrierScopeTotals(carrierScopeText);
    if (parsed.parsedLineCount === 0) return undefined;

    const estimatedMidUsd = Math.round(
      (estimate.lowCostUsd + estimate.highCostUsd) / 2,
    );
    const valuationBasis: RoofReport["carrierComparison"]["valuationBasis"] =
      typeof parsed.rcvUsd === "number"
        ? "RCV"
        : typeof parsed.acvUsd === "number"
          ? "ACV"
          : "line-total";
    const parsedCarrierTotalUsd =
      valuationBasis === "RCV"
        ? parsed.rcvUsd!
        : valuationBasis === "ACV"
          ? parsed.acvUsd!
          : parsed.totalUsd;

    const depreciationUsd = Math.max(
      0,
      typeof parsed.depreciationUsd === "number"
        ? parsed.depreciationUsd
        : typeof parsed.rcvUsd === "number" && typeof parsed.acvUsd === "number"
          ? parsed.rcvUsd - parsed.acvUsd
          : 0,
    );
    const deductible = Math.max(0, Math.round(deductibleUsd ?? 0));
    const nonRecoverableDep = Math.max(
      0,
      Math.min(
        Math.round(nonRecoverableDepreciationUsd ?? 0),
        Math.round(depreciationUsd),
      ),
    );
    const recoverableDepreciationUsd = Math.max(
      0,
      Math.round(depreciationUsd) - nonRecoverableDep,
    );
    const acvForPayment =
      typeof parsed.acvUsd === "number"
        ? parsed.acvUsd
        : Math.max(0, parsedCarrierTotalUsd - Math.round(depreciationUsd));
    const initialPaymentUsd = Math.max(
      0,
      Math.round(acvForPayment) - deductible,
    );
    const projectedFinalPaymentUsd =
      initialPaymentUsd + recoverableDepreciationUsd;
    const estimatedOutOfPocketUsd = Math.max(
      0,
      estimatedMidUsd - projectedFinalPaymentUsd,
    );

    const deltaUsd = estimatedMidUsd - parsedCarrierTotalUsd;
    let deltaDirection: "under-scoped" | "over-scoped" | "aligned" = "aligned";
    if (deltaUsd > 1500) deltaDirection = "under-scoped";
    else if (deltaUsd < -1500) deltaDirection = "over-scoped";

    const carrierText = parsed.descriptions.join(" ").toLowerCase();
    const likelyMissingItems: string[] = [];
    const addIfMissing = (regex: RegExp, label: string) => {
      if (!regex.test(carrierText)) likelyMissingItems.push(label);
    };
    addIfMissing(/tear|remove|demo|disposal/, "Tear-off and disposal");
    addIfMissing(/drip edge|edge metal/, "Drip edge / edge metal");
    addIfMissing(
      /flashing|step flashing|counter flashing/,
      "Flashing upgrades",
    );
    addIfMissing(/ridge vent|ventilation|soffit/, "Ventilation line items");
    addIfMissing(/ice|water shield|self-adhered/, "Ice and water shield");
    addIfMissing(/overhead|profit|o&p|supervision/, "Overhead and profit");

    return {
      carrierItemsCount: parsed.parsedLineCount,
      parsedCarrierTotalUsd,
      parsedRcvUsd: parsed.rcvUsd,
      parsedAcvUsd: parsed.acvUsd,
      parsedDepreciationUsd: parsed.depreciationUsd,
      valuationBasis,
      detectedLineCodes: parsed.detectedLineCodes,
      parserConfidence: parsed.parserConfidence,
      lineMathMismatchCount: parsed.lineMathMismatchCount,
      parsedFromLineMathTotalUsd: parsed.parsedFromLineMathTotalUsd,
      settlementProjection: {
        deductibleUsd: deductible,
        depreciationUsd: Math.round(depreciationUsd),
        nonRecoverableDepreciationUsd: nonRecoverableDep,
        recoverableDepreciationUsd,
        initialPaymentUsd,
        projectedFinalPaymentUsd,
        estimatedOutOfPocketUsd,
      },
      estimatedMidUsd,
      deltaUsd,
      deltaDirection,
      likelyMissingItems: likelyMissingItems.slice(0, 5),
      note: "Xactimate-style parser uses labeled RCV/ACV totals when present; otherwise sums parsed line values.",
    };
  }

  private buildClaimAudit(estimate: RoofDamageEstimate): {
    recoveryDeltaLowUsd: number;
    recoveryDeltaHighUsd: number;
    findings: string[];
    summary: string;
    timeline: string[];
  } {
    const findings: string[] = [];
    let pctLow = 0;
    let pctHigh = 0;
    const lineDescriptions = (estimate.lineItems ?? [])
      .map((line) => line.description.toLowerCase())
      .join(" | ");

    const hasTearOff =
      /tear-off|tear off|remove/.test(lineDescriptions) ||
      estimate.scope === "replace";
    const hasFlashing = /flashing/.test(lineDescriptions);
    const hasVent = /vent|ridge cap|drip edge/.test(lineDescriptions);

    if (!hasTearOff) {
      findings.push(
        "Possible omitted tear-off/disposal allowance in carrier scope.",
      );
      pctLow += 0.05;
      pctHigh += 0.09;
    }
    if (!hasFlashing) {
      findings.push(
        "Potential flashing step/counter-flashing replacement omission.",
      );
      pctLow += 0.03;
      pctHigh += 0.06;
    }
    if (!hasVent) {
      findings.push(
        "Accessory scope check: ventilation, ridge caps, and drip edge.",
      );
      pctLow += 0.02;
      pctHigh += 0.05;
    }

    const codeHints = estimate.codeUpgrades ?? [];
    if (codeHints.length > 0) {
      findings.push(
        `Code upgrade review required for ${Math.min(codeHints.length, 3)} item(s): check ordinance/law coverage.`,
      );
      pctLow += 0.03;
      pctHigh += 0.08;
    }

    if (estimate.highCostUsd >= 25000) {
      findings.push("Large-loss check: verify O&P and supervision allowances.");
      pctLow += 0.04;
      pctHigh += 0.1;
    }

    pctLow = Math.min(pctLow, 0.22);
    pctHigh = Math.min(pctHigh, 0.35);

    const recoveryDeltaLowUsd = Math.round(estimate.lowCostUsd * pctLow);
    const recoveryDeltaHighUsd = Math.round(estimate.highCostUsd * pctHigh);
    const summary =
      findings.length > 0
        ? "Potential under-scoped items detected for supplemental claim review."
        : "No obvious scope gaps detected from current line-item profile.";

    return {
      recoveryDeltaLowUsd,
      recoveryDeltaHighUsd,
      findings,
      summary,
      timeline: [
        "Intake: compare carrier scope against trade-line estimate.",
        "Gap audit: flag code, flashing, accessory, and waste-factor differences.",
        "Supplement draft: build line-item addendum with photo evidence.",
        "Carrier follow-up: track approvals and recovered delta.",
      ],
    };
  }

  /**
   * Export report to plain-text document (PDF generation can wrap this output).
   */
  async exportReportPDF(report: RoofReport): Promise<string> {
    const pdfContent = `
ROOF INSPECTION REPORT
Generated: ${new Date(report.generatedAt).toLocaleDateString()}
Report ID: ${report.id}

ADDRESS: ${report.address}

EXECUTIVE SUMMARY
${report.executiveSummary}

ROOF CONDITION
- Overall Condition: ${report.condition.overall}
- Material Type: ${report.condition.material}
- Age: ${report.condition.age} years

IDENTIFIED ISSUES
${report.issues.identified.map((issue, i) => `${i + 1}. ${issue}`).join("\n")}

PRIORITY ORDER
${report.issues.priorityOrder.map((item, i) => `${i + 1}. ${item}`).join("\n")}

RECOMMENDATIONS
REPAIRS:
${report.recommendations.repairs.map((r) => `- ${r}`).join("\n")}

MAINTENANCE:
${report.recommendations.maintenance.map((m) => `- ${m}`).join("\n")}

PREVENTATIVE MEASURES:
${report.recommendations.preventative.map((p) => `- ${p}`).join("\n")}

COST ESTIMATE
Low Range: ${report.costEstimate.lowRange}
High Range: ${report.costEstimate.highRange}
Urgency Level: ${report.costEstimate.urgency}
Potential Recovery Delta: ${report.costEstimate.recoveryDeltaRange ?? "N/A"}
Audit Summary: ${report.costEstimate.auditSummary ?? "N/A"}
Audit Findings:
${(report.costEstimate.auditFindings ?? []).map((f) => `- ${f}`).join("\n")}

${
  report.carrierComparison
    ? `CARRIER SCOPE COMPARISON
Carrier parsed line items: ${report.carrierComparison.carrierItemsCount}
Valuation basis: ${report.carrierComparison.valuationBasis}
Parser confidence: ${report.carrierComparison.parserConfidence}
Carrier parsed total: ${this.formatCurrency(report.carrierComparison.parsedCarrierTotalUsd)}
Parsed from line math total: ${this.formatCurrency(report.carrierComparison.parsedFromLineMathTotalUsd)}
Line math mismatch count: ${report.carrierComparison.lineMathMismatchCount}
Parsed RCV: ${typeof report.carrierComparison.parsedRcvUsd === "number" ? this.formatCurrency(report.carrierComparison.parsedRcvUsd) : "N/A"}
Parsed ACV: ${typeof report.carrierComparison.parsedAcvUsd === "number" ? this.formatCurrency(report.carrierComparison.parsedAcvUsd) : "N/A"}
Parsed Depreciation: ${typeof report.carrierComparison.parsedDepreciationUsd === "number" ? this.formatCurrency(report.carrierComparison.parsedDepreciationUsd) : "N/A"}
Estimator midpoint: ${this.formatCurrency(report.carrierComparison.estimatedMidUsd)}
Delta (${report.carrierComparison.deltaDirection}): ${this.formatCurrency(report.carrierComparison.deltaUsd)}
Detected line codes: ${report.carrierComparison.detectedLineCodes.join(", ") || "none"}
Settlement Projection:
- Deductible: ${this.formatCurrency(report.carrierComparison.settlementProjection?.deductibleUsd ?? 0)}
- Recoverable depreciation: ${this.formatCurrency(report.carrierComparison.settlementProjection?.recoverableDepreciationUsd ?? 0)}
- Initial ACV payment (est): ${this.formatCurrency(report.carrierComparison.settlementProjection?.initialPaymentUsd ?? 0)}
- Final total payment after recoverable dep (est): ${this.formatCurrency(report.carrierComparison.settlementProjection?.projectedFinalPaymentUsd ?? 0)}
- Estimated out-of-pocket vs estimator midpoint: ${this.formatCurrency(report.carrierComparison.settlementProjection?.estimatedOutOfPocketUsd ?? 0)}
Likely missing scope:
${report.carrierComparison.likelyMissingItems.map((line) => `- ${line}`).join("\n")}
`
    : ""
}

MEASUREMENT INTELLIGENCE
Area (plan): ${Math.round(report.measurements.areaSqFt).toLocaleString()} sq ft
Perimeter: ${
      typeof report.measurements.perimeterFt === "number"
        ? `${Math.round(report.measurements.perimeterFt).toLocaleString()} ft`
        : "N/A"
    }
Pitch: ${report.measurements.pitch ?? "N/A"}
Effective Squares: ${
      typeof report.measurements.effectiveSquares === "number"
        ? report.measurements.effectiveSquares.toFixed(2)
        : "N/A"
    }
Waste Factor: ${
      typeof report.measurements.wasteFactorPct === "number"
        ? `${report.measurements.wasteFactorPct}%`
        : "N/A"
    }
Guidance:
${(report.measurements.guidance ?? []).map((line) => `- ${line}`).join("\n")}
Measurement quality score: ${report.measurements.qualityScore ?? "N/A"}/100
Measurement warnings:
${(report.measurements.qualityWarnings ?? []).map((line) => `- ${line}`).join("\n")}
Coordinates: ${
      typeof report.measurements.latitude === "number" &&
      typeof report.measurements.longitude === "number"
        ? `${report.measurements.latitude.toFixed(6)}, ${report.measurements.longitude.toFixed(6)}`
        : "N/A"
    }

MAINTENANCE SCHEDULE
MONTHLY TASKS:
${report.maintenanceSchedule.monthly.map((m) => `- ${m}`).join("\n")}

SEASONAL TASKS:
${report.maintenanceSchedule.seasonal.map((s) => `- ${s}`).join("\n")}

ANNUAL TASKS:
${report.maintenanceSchedule.annual.map((a) => `- ${a}`).join("\n")}
    `;

    return pdfContent;
  }

  private extractSummary(
    response: OpenAIResponse & { message: string },
  ): string {
    return (
      response.message || "Professional roof inspection analysis available."
    );
  }

  private extractCondition(
    response: OpenAIResponse & { message: string },
  ): string {
    const message = response.message || "";
    if (message.includes("Excellent") || message.includes("excellent"))
      return "Excellent";
    if (message.includes("Good") || message.includes("good")) return "Good";
    if (message.includes("Fair") || message.includes("fair")) return "Fair";
    if (message.includes("Poor") || message.includes("poor")) return "Poor";
    return "Fair";
  }

  private extractSeverities(
    response: OpenAIResponse & { message: string },
  ): string[] {
    const message = response.message || "";
    const severities: string[] = [];
    if (message.includes("Critical")) severities.push("Critical");
    if (message.includes("High")) severities.push("High");
    if (message.includes("Medium")) severities.push("Medium");
    if (message.includes("Low")) severities.push("Low");
    return severities.length > 0 ? severities : ["Medium"];
  }

  private extractPriorities(
    response: OpenAIResponse & { message: string },
  ): string[] {
    const message = response.message || "";
    return message
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .slice(0, 5);
  }

  private extractRepairs(
    response: OpenAIResponse & { message: string },
  ): string[] {
    const message = response.message || "";
    return message
      .split("\n")
      .filter((line) => line.includes("repair") || line.includes("fix"))
      .slice(0, 5);
  }

  private extractMaintenance(
    response: OpenAIResponse & { message: string },
  ): string[] {
    const message = response.message || "";
    return message
      .split("\n")
      .filter((line) => line.includes("maintain") || line.includes("clean"))
      .slice(0, 5);
  }

  private extractPreventative(
    response: OpenAIResponse & { message: string },
  ): string[] {
    const message = response.message || "";
    return message
      .split("\n")
      .filter((line) => line.includes("prevent") || line.includes("avoid"))
      .slice(0, 5);
  }

  private extractMonthly(
    response: OpenAIResponse & { message: string },
  ): string[] {
    const message = response.message || "";
    return message
      .split("\n")
      .filter((line) => line.includes("month") || line.includes("Monthly"))
      .slice(0, 3);
  }

  private extractSeasonal(
    response: OpenAIResponse & { message: string },
  ): string[] {
    const message = response.message || "";
    return message
      .split("\n")
      .filter((line) => line.includes("season") || line.includes("Seasonal"))
      .slice(0, 4);
  }

  private extractAnnual(
    response: OpenAIResponse & { message: string },
  ): string[] {
    const message = response.message || "";
    return message
      .split("\n")
      .filter((line) => line.includes("year") || line.includes("Annual"))
      .slice(0, 4);
  }
}

export default RoofReportBuilderAgent;
