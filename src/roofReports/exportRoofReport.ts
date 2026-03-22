import { Platform } from "react-native";

import { shareTextFile } from "@/src/utils/shareTextFile";

import type {
  DamageRoofReport,
  DamageType,
  RoofReportImage,
  BuildingCodeInfo,
  RoofMeasurements,
  RoofDamageEstimate,
  NonRoofLineItemsEstimate,
} from "./roofReportTypes";
import { getCompanyLogoUrl, getIntroNarrative } from "./companyBranding";
import {
  COMMERCIAL_FLAT_ROOF_INSTRUCTIONS_KB_TITLE,
  COMMERCIAL_FLAT_ROOF_INSTRUCTIONS_SECTIONS,
} from "./lowSlopeCheatSheetInstructions";
import { propertyMeasurementKbExportLines } from "./propertyMeasurementKnowledgeBase";
import {
  IBC_CHAPTER_15_KB_DISCLAIMER,
  IBC_CHAPTER_15_KB_TITLE,
  IBC_CHAPTER_15_SECTION_GROUPS,
  IBC_CHAPTER_15_TYPICAL_EDITION_NOTE,
} from "./ibcChapter15RoofKnowledgeBase";
import {
  IRC_CHAPTER_8_ABOUT,
  IRC_CHAPTER_8_KB_DISCLAIMER,
  IRC_CHAPTER_8_KB_TITLE,
  IRC_CHAPTER_8_SECTION_GROUPS,
  IRC_CHAPTER_8_TYPICAL_EDITION_NOTE,
} from "./ircChapter8RoofCeilingKnowledgeBase";
import {
  IRC_CHAPTER_9_ABOUT,
  IRC_CHAPTER_9_KB_DISCLAIMER,
  IRC_CHAPTER_9_KB_TITLE,
  IRC_CHAPTER_9_SECTION_GROUPS,
  IRC_CHAPTER_9_TYPICAL_EDITION_NOTE,
} from "./ircChapter9RoofAssembliesKnowledgeBase";
import {
  MO_IRC_INSURANCE_ABOUT,
  MO_IRC_INSURANCE_KB_DISCLAIMER,
  MO_IRC_INSURANCE_KB_TITLE,
  MO_IRC_INSURANCE_SECTION_GROUPS,
  MO_IRC_INSURANCE_TYPICAL_EDITION_NOTE,
} from "./missouriIrcInsuranceSupplementKnowledgeBase";
import {
  COMMERCIAL_ROOF_TAX_KB_DISCLAIMER,
  COMMERCIAL_ROOF_TAX_KB_EDITION_NOTE,
  COMMERCIAL_ROOF_TAX_KB_TITLE,
  COMMERCIAL_ROOF_TAX_SECTION_GROUPS,
  commercialRoofTaxNotesApplyToReport,
} from "./commercialRoofTaxIncentivesKnowledgeBase";
import { formatPropertyUseLabel } from "./propertyUseClassification";
import {
  showIbcChapter15Knowledge,
  showIrcChaptersKnowledge,
} from "./reportKnowledgeVisibility";
import { FIELD_QA_ITEMS } from "./fieldQaChecklist";
import {
  safeExportFilenamePart,
  serializeRoofReportToJsonPretty,
} from "./exportRoofReportSerialize";

/** Progress 0–100 and short label for export UI. */
export type ExportProgressCallback = (percent: number, phase: string) => void;

export interface ExportRoofReportOptions {
  onProgress?: ExportProgressCallback;
}

function formatDate(iso: string) {
  // Try to keep it stable in output (no locale surprises for exports)
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function renderDamageList(damageTypes?: DamageType[] | null) {
  if (!damageTypes?.length) return "<li>None selected</li>";
  return damageTypes.map((d) => `<li>${d}</li>`).join("");
}

function escapeHtml(input: any): string {
  const str = input == null ? "" : String(input);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toInitials(name?: string): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("");
}

function renderBuildingCode(
  buildingCode?: BuildingCodeInfo,
  inspectorName?: string,
) {
  if (!buildingCode) return "";
  const checks = buildingCode.checks ?? [];
  const inspectorInitials = toInitials(inspectorName);
  const checklistRows = checks
    .map(
      (c) => `
        <tr>
          <td>${escapeHtml(c.label)}</td>
          <td>☐</td>
          <td>☐</td>
          <td>☐</td>
          <td>${escapeHtml(inspectorInitials)}</td>
        </tr>
      `,
    )
    .join("");
  return `
    <div class="section">
      <h2>Building code & compliance</h2>
      <div class="muted">${escapeHtml(buildingCode.codeReference || "")}</div>
      ${buildingCode.jurisdiction ? `<div class="muted">${escapeHtml(buildingCode.jurisdiction)}</div>` : ""}
      <div class="bullets">
        ${checks
          .map(
            (c) =>
              `<div class="check"><div class="checkLabel">• ${escapeHtml(c.label)}</div>${
                c.details
                  ? `<div class="checkDetails">${escapeHtml(c.details)}</div>`
                  : ""
              }</div>`,
          )
          .join("")}
      </div>
      <div style="margin-top:12px;">
        <div class="label">Code Pass/Fail Checklist</div>
        <table class="codeTable">
          <thead>
            <tr>
              <th>Code Item</th>
              <th>Pass</th>
              <th>Fail</th>
              <th>N/A</th>
              <th>Initials</th>
            </tr>
          </thead>
          <tbody>
            ${checklistRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderMeasurements(measurements?: RoofMeasurements) {
  if (!measurements) return "";

  return `
    <div class="section">
      <h2>Property measurement details</h2>
      <div class="grid2">
        <div><div class="label">Roof Area</div><div class="value">${
          measurements.roofAreaSqFt
            ? `${Math.round(measurements.roofAreaSqFt).toLocaleString()} sq ft`
            : "Not traced"
        }</div></div>
        <div><div class="label">Roof Perimeter</div><div class="value">${
          measurements.roofPerimeterFt
            ? `${Math.round(measurements.roofPerimeterFt).toLocaleString()} ft`
            : "Not traced"
        }</div></div>
      </div>
      ${
        measurements.roofPitch
          ? `<div style="margin-top:12px;"><div class="label">Roof Pitch</div><div class="value">${escapeHtml(
              measurements.roofPitch.trim(),
            )}</div></div>`
          : ""
      }
      ${
        measurements.roofPitchAiGauge?.estimatePitch
          ? `<div style="margin-top:12px;padding:10px 12px;background:#f1f5f9;border-radius:8px;border:1px solid #e2e8f0;">
              <div class="label">AI photo analysis (advisory)</div>
              <div class="value" style="margin-top:4px;">${escapeHtml(
                measurements.roofPitchAiGauge.estimatePitch.trim(),
              )} · confidence: ${escapeHtml(measurements.roofPitchAiGauge.confidence)}</div>
              <div class="muted" style="margin-top:6px;font-size:12px;">${escapeHtml(
                measurements.roofPitchAiGauge.rationale || "",
              )}</div>
              ${
                measurements.roofPitchAiGauge.imageSource
                  ? `<div class="muted" style="margin-top:4px;font-size:11px;">Source: ${escapeHtml(
                      measurements.roofPitchAiGauge.imageSource,
                    )}</div>`
                  : ""
              }
              ${
                measurements.roofPitchAiGauge.estimateRoofAreaSqFt != null ||
                measurements.roofPitchAiGauge.estimateRoofPerimeterFt != null
                  ? `<div class="muted" style="margin-top:8px;font-size:12px;">AI from image: ${
                      measurements.roofPitchAiGauge.estimateRoofAreaSqFt != null
                        ? `${Math.round(measurements.roofPitchAiGauge.estimateRoofAreaSqFt).toLocaleString()} sq ft`
                        : "—"
                    }, ${
                      measurements.roofPitchAiGauge.estimateRoofPerimeterFt !=
                      null
                        ? `${Math.round(measurements.roofPitchAiGauge.estimateRoofPerimeterFt).toLocaleString()} ft perimeter`
                        : "—"
                    }${
                      measurements.roofPitchAiGauge.measurementConfidence
                        ? ` (${escapeHtml(measurements.roofPitchAiGauge.measurementConfidence)} confidence)`
                        : ""
                    }</div>`
                  : ""
              }
              ${
                measurements.roofPitchAiGauge.measurementRationale
                  ? `<div class="muted" style="margin-top:6px;font-size:12px;">${escapeHtml(
                      measurements.roofPitchAiGauge.measurementRationale,
                    )}</div>`
                  : ""
              }
            </div>`
          : ""
      }
      ${
        measurements.measurementValidationSummary
          ? `<div style="margin-top:14px;padding:12px;border-radius:8px;border:1px solid #cbd5e1;background:#f8fafc;">
              <div class="label">Measurement cross-check (${escapeHtml(
                measurements.measurementValidationSummary.overallConfidence,
              )} confidence)</div>
              <ul style="margin:8px 0 0 16px;padding:0;font-size:12px;line-height:1.45;color:#334155;">
                ${measurements.measurementValidationSummary.messages
                  .map((m) => `<li>${escapeHtml(m)}</li>`)
                  .join("")}
              </ul>
              ${
                measurements.measurementValidationSummary.messages.length === 0
                  ? `<div class="muted" style="margin-top:6px;font-size:12px;">Sources agree within configured tolerances (or only one source is present).</div>`
                  : ""
              }
            </div>`
          : ""
      }
      ${
        measurements.notes
          ? `<div class="muted" style="margin-top:10px;">${escapeHtml(measurements.notes)}</div>`
          : ""
      }
    </div>
  `;
}

function renderScheduleInspection(report: DamageRoofReport) {
  const s = report.scheduleInspection;
  if (!s) return "";
  const phone = s.phone
    ? `<div><div class="label">Phone</div><div class="metaText">${escapeHtml(s.phone)}</div></div>`
    : "";
  const email = s.email
    ? `<div style="margin-top:8px;"><div class="label">Email</div><div class="metaText">${escapeHtml(s.email)}</div></div>`
    : "";
  const ai = s.aiClientMessage
    ? `<div class="muted" style="margin-top:12px;line-height:1.5;font-style:italic;">${escapeHtml(s.aiClientMessage)}</div>`
    : "";
  return `
    <div class="section" style="border:1px solid #c7d2fe;background:#f8fafc;padding:14px;border-radius:8px;">
      <h2 style="margin-top:0;">${escapeHtml(s.headline)}</h2>
      <div class="metaText" style="line-height:1.55;">${escapeHtml(s.body)}</div>
      ${phone}
      ${email}
      ${ai}
      <div class="muted" style="margin-top:12px;font-size:11px;line-height:1.45;">${escapeHtml(s.disclaimer)}</div>
    </div>
  `;
}

function renderEstimate(estimate?: RoofDamageEstimate, inspectorName?: string) {
  if (!estimate) return "";
  const range = `$${estimate.lowCostUsd.toLocaleString()} - $${estimate.highCostUsd.toLocaleString()}`;

  return `
    <div class="section">
      <h2>Damage cost estimate</h2>
      <div class="grid2">
        <div><div class="label">Scope</div><div class="metaText">${escapeHtml(estimate.scope.toUpperCase())}</div></div>
        <div><div class="label">Confidence</div><div class="metaText">${escapeHtml(estimate.confidence.toUpperCase())}</div></div>
      </div>
      <div style="margin-top:10px;">
        <div class="label">Preliminary ballpark range</div>
        <div class="metaText">${escapeHtml(range)}</div>
      </div>
      <div class="muted" style="margin-top:8px;font-size:11px;line-height:1.45;">
        Calculator output only — not a bid or contract. An on-site inspection confirms scope, code, and final pricing.
      </div>
      ${inspectorName ? `<div class="muted" style="margin-top:10px;">Inspector: ${escapeHtml(inspectorName)}</div>` : ""}
      ${estimate.notes ? `<div class="muted" style="margin-top:10px; line-height:1.45;">${escapeHtml(estimate.notes)}</div>` : ""}
    </div>
  `;
}

function renderNonRoofEstimate(
  nonRoof?: NonRoofLineItemsEstimate,
  inspectorName?: string,
) {
  if (!nonRoof) return "";
  const items: string[] = [];
  if (nonRoof.hvacUnits)
    items.push(`HVAC units replaced: ${nonRoof.hvacUnits}`);
  if (nonRoof.finCombUnits)
    items.push(`Condenser fin comb: ${nonRoof.finCombUnits}`);
  if (nonRoof.fenceCleanSqFt)
    items.push(
      `Fence clean: ${Math.round(nonRoof.fenceCleanSqFt).toLocaleString()} sq ft`,
    );
  if (nonRoof.fenceStainSqFt)
    items.push(
      `Fence stain: ${Math.round(nonRoof.fenceStainSqFt).toLocaleString()} sq ft`,
    );
  if (nonRoof.windowWrapSmallQty)
    items.push(`Window wrap small: ${nonRoof.windowWrapSmallQty}`);
  if (nonRoof.windowWrapStandardQty)
    items.push(`Window wrap standard: ${nonRoof.windowWrapStandardQty}`);
  if (nonRoof.houseWrapSqFt)
    items.push(
      `House wrap: ${Math.round(nonRoof.houseWrapSqFt).toLocaleString()} sq ft`,
    );
  if (nonRoof.fanfoldSqFt)
    items.push(
      `Fanfold foam: ${Math.round(nonRoof.fanfoldSqFt).toLocaleString()} sq ft`,
    );

  const range = `$${nonRoof.lowCostUsd.toLocaleString()} - $${nonRoof.highCostUsd.toLocaleString()}`;
  return `
    <div class="section">
      <h2>Non-Roof Items (Itemized)</h2>
      <div class="bullets">${items.map((i) => `<div class="checkLabel">• ${escapeHtml(i)}</div>`).join("")}</div>
      <div style="margin-top:10px;">
        <div class="label">Non-Roof Range</div>
        <div class="metaText">${escapeHtml(range)}</div>
      </div>
      ${inspectorName ? `<div class="muted" style="margin-top:10px;">Inspector: ${escapeHtml(inspectorName)}</div>` : ""}
    </div>
  `;
}

function renderImages(images?: RoofReportImage[]) {
  const list = images ?? [];
  if (!list.length) return "";

  const chunkSize = 6;
  const pages: RoofReportImage[][] = [];
  for (let i = 0; i < list.length; i += chunkSize)
    pages.push(list.slice(i, i + chunkSize));

  const pageHtml = pages
    .map(
      (page, pageIdx) => `
      <div class="page">
        <div class="pageTitle">Photos (${pageIdx + 1} / ${pages.length})</div>
        <div class="photoGrid">
          ${page
            .map(
              (img) => `
            <div class="photo">
              <img src="${escapeHtml(img.dataUrl)}" alt="${escapeHtml(img.caption || "Photo")}" />
              <div class="photoCaption">${escapeHtml(img.caption || "Photo")}</div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `,
    )
    .join("");

  return `
    <div class="section">
      <h2>Photo documentation</h2>
      <p class="sectionLead">Field photos attached to this report.</p>
    </div>
    ${pageHtml}
  `;
}

function renderPropertyImage(report: DamageRoofReport) {
  if (!report.propertyImageUrl) return "";
  return `
    <div class="section sectionHero">
      <h2>Property overview</h2>
      <p class="sectionLead">Aerial / map imagery for the structure at this address.</p>
      <img class="heroImg" src="${escapeHtml(report.propertyImageUrl)}" alt="Property" />
      <div class="muted" style="margin-top:8px;">Source: ${escapeHtml(report.propertyImageSource || "Map image")}</div>
    </div>
  `;
}

function renderRoofDiagram(report: DamageRoofReport) {
  if (!report.roofDiagramImageUrl) return "";
  const area = report.measurements?.roofAreaSqFt;
  const squares =
    area && Number.isFinite(area) ? (area / 100).toFixed(2) : undefined;
  return `
    <div class="section">
      <h2>Roof area diagram</h2>
      <p class="sectionLead">Measured roof face area from your trace.</p>
      <img class="diagramImg" src="${escapeHtml(report.roofDiagramImageUrl)}" alt="Roof diagram" />
      <div class="muted" style="margin-top:8px;">
        ${escapeHtml(report.roofDiagramSource || "Generated from roof measurements")}
        ${squares ? ` | Roof squares: ${escapeHtml(squares)}` : ""}
      </div>
    </div>
  `;
}

function renderRoofPitchDiagram(report: DamageRoofReport) {
  if (!report.roofPitchDiagramImageUrl) return "";
  return `
    <div class="section">
      <h2>Slope & pitch diagram</h2>
      <p class="sectionLead">Pitch and direction visualization for ordering and waste.</p>
      <img class="diagramImg" src="${escapeHtml(report.roofPitchDiagramImageUrl)}" alt="Pitches diagram" />
      <div class="muted" style="margin-top:8px;">
        ${escapeHtml(report.roofPitchDiagramSource || "Generated from roof pitch")}
      </div>
    </div>
  `;
}

function renderRoofLengthsDiagram(report: DamageRoofReport) {
  if (!report.roofLengthsDiagramImageUrl) return "";
  return `
    <div class="section">
      <h2>Edge lengths</h2>
      <p class="sectionLead">Perimeter and run lengths from traced outline.</p>
      <img class="diagramImg" src="${escapeHtml(report.roofLengthsDiagramImageUrl)}" alt="Lengths diagram" />
      <div class="muted" style="margin-top:8px;">
        ${escapeHtml(report.roofLengthsDiagramSource || "Generated from traced roof outline")}
      </div>
    </div>
  `;
}

function renderRoofLidar3dDiagram(report: DamageRoofReport) {
  if (!report.roofLidar3dDiagramImageUrl) return "";
  return `
    <div class="section">
      <h2>3D roof projection</h2>
      <p class="sectionLead">Axonometric view with edge lengths (LiDAR-style visualization).</p>
      <img class="diagramImg" src="${escapeHtml(report.roofLidar3dDiagramImageUrl)}" alt="3D roof LiDAR-style diagram" />
      <div class="muted" style="margin-top:8px;">
        ${escapeHtml(report.roofLidar3dDiagramSource || "Axonometric projection from traced footprint")}
      </div>
    </div>
  `;
}

function renderMaterialRequirements(report: DamageRoofReport) {
  const mr = report.materialRequirements;
  if (!mr) return "";

  const wastePctPart =
    typeof mr.wastePct === "number"
      ? ` (${escapeHtml(String(mr.wastePct))}%)`
      : "";
  const extrasHtml = mr.extras?.length
    ? mr.extras.map((e) => `<li>${escapeHtml(e)}</li>`).join("")
    : "";
  const extrasBlock = extrasHtml
    ? `<div style="margin-top:10px;"><div class="label">Extras to consider</div><ul>${extrasHtml}</ul></div>`
    : "";

  return `
    <div class="section">
      <h2>Material takeoff</h2>
      <div class="grid2">
        <div><div class="label">Roofing Material</div><div class="value">${escapeHtml(mr.mainMaterial)}</div></div>
        <div><div class="label">Unit</div><div class="value">${escapeHtml(mr.unit)}</div></div>
      </div>
      <div style="margin-top:10px;">
        <div class="label">Roof classification</div>
        <div class="metaText">${escapeHtml(mr.roofType)}</div>
      </div>
      <div style="margin-top:6px;">
        <div class="label">Waste factor</div>
        <div class="metaText">${escapeHtml(mr.wasteFactor.toFixed(2))}x${wastePctPart}</div>
      </div>
      ${mr.notes ? `<div class="muted" style="margin-top:10px; line-height:1.45;">Notes: ${escapeHtml(mr.notes)}</div>` : ""}
      ${extrasBlock}
    </div>
  `;
}

function renderMetarWeatherSection(report: DamageRoofReport): string {
  const m = report.metarWeather;
  if (!m) return "";
  const lines = m.summaryLines
    .slice(0, 14)
    .map(
      (l) =>
        `<div class="muted" style="font-size:12px;line-height:1.45;margin-top:4px;">${escapeHtml(l)}</div>`,
    )
    .join("");
  return `
    <div class="section">
      <h2>Airport weather (METAR)</h2>
      <p class="muted">Nearest reference station to the property — airport observation, not rooftop wind.</p>
      ${lines}
    </div>
  `;
}

function renderFieldQaSection(report: DamageRoofReport): string {
  const q = report.fieldQaChecklist;
  if (!q || !Object.values(q).some(Boolean)) return "";
  const items = FIELD_QA_ITEMS.filter((it) => q[it.id])
    .map((it) => `<li>${escapeHtml(it.label)}</li>`)
    .join("");
  return `
    <div class="section">
      <h2>Field QA checklist</h2>
      <ul style="margin:8px 0 0 18px;line-height:1.45;font-size:13px;">${items}</ul>
    </div>
  `;
}

function renderAiDamageRisk(report: DamageRoofReport) {
  const r = report.aiDamageRisk;
  if (!r) return "";

  const factorsHtml = r.factors?.length
    ? `<ul>${r.factors.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>`
    : "";
  const planHtml = r.actionPlan?.length
    ? `<ul>${r.actionPlan.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`
    : "";

  return `
    <div class="section">
      <h2>Damage risk assessment</h2>
      <div class="grid2">
        <div><div class="label">Score</div><div class="value">${escapeHtml(String(r.score))}/100</div></div>
        <div><div class="label">Level</div><div class="value">${escapeHtml(String(r.level))}</div></div>
      </div>
      ${factorsHtml ? `<div style="margin-top:10px;"><div class="label">Factors</div>${factorsHtml}</div>` : ""}
      ${planHtml ? `<div style="margin-top:10px;"><div class="label">Action plan</div>${planHtml}</div>` : ""}
    </div>
  `;
}

function renderLowSlopeMaterialEstimate(report: DamageRoofReport): string {
  const ls = report.lowSlopeMaterialEstimate;
  if (!ls) return "";

  const linesHtml = ls.lines
    .map(
      (ln) => `
        <li>
          ${escapeHtml(`${ln.quantity} ${ln.unit} — ${ln.description}`)}
          — $${escapeHtml(
            ln.lineTotalUsd.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            }),
          )}
        </li>`,
    )
    .join("");

  const notesHtml = ls.notes?.length
    ? `<ul>${ls.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>`
    : "";

  const scopeLabel =
    ls.scopeMode === "full-replacement"
      ? "Full replacement (indicative)"
      : "Repair (indicative)";

  return `
    <div class="section">
      <h2>Low-slope material pricing (reference)</h2>
      <div class="muted">
        ${escapeHtml(ls.priceListReference)} · catalog: ${escapeHtml(ls.catalogSystem)} · ${escapeHtml(scopeLabel)}
      </div>
      <div class="grid2" style="margin-top:10px;">
        <div><div class="label">Roof squares</div><div class="value">${escapeHtml(ls.roofSquares.toFixed(2))}</div></div>
        <div><div class="label">Subtotal (remove + replace + tax lines)</div><div class="value">$${escapeHtml(ls.totals.subtotalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 }))}</div></div>
      </div>
      <div style="margin-top:10px;">
        <div class="label">Remove / replace / tax (rolled up)</div>
        <div class="metaText">
          Remove: $${escapeHtml(ls.totals.removeUsd.toLocaleString(undefined, { maximumFractionDigits: 0 }))}
          · Replace: $${escapeHtml(ls.totals.replaceUsd.toLocaleString(undefined, { maximumFractionDigits: 0 }))}
          · Tax: $${escapeHtml(ls.totals.taxUsd.toLocaleString(undefined, { maximumFractionDigits: 0 }))}
        </div>
      </div>
      <div style="margin-top:10px;">
        <div class="label">Line items</div>
        <ul>${linesHtml}</ul>
      </div>
      ${notesHtml ? `<div style="margin-top:10px;"><div class="label">Notes</div>${notesHtml}</div>` : ""}
    </div>
  `;
}

function renderCommercialFlatRoofInstructionsKb(
  report: DamageRoofReport,
): string {
  if (!report.lowSlopeMaterialEstimate) return "";

  const blocks = COMMERCIAL_FLAT_ROOF_INSTRUCTIONS_SECTIONS.map(
    (sec) => `
      <div style="margin-top:12px;">
        <div class="label">${escapeHtml(sec.heading)}</div>
        <ul style="margin-top:6px;">
          ${sec.lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}
        </ul>
      </div>`,
  ).join("");

  return `
    <div class="section">
      <h2>${escapeHtml(COMMERCIAL_FLAT_ROOF_INSTRUCTIONS_KB_TITLE)}</h2>
      <div class="muted">Workbook Tab 6 — Instructions &amp; Notes (AI cheat sheet)</div>
      ${blocks}
    </div>
  `;
}

function renderEagleViewEstimate(report: DamageRoofReport) {
  const ev = report.eagleViewEstimate;
  if (!ev) return "";

  const m = ev.materials;
  const lines = [
    `Shingles: ${m.shingles.quantity.toFixed(2)} sq · $${escapeHtml(m.shingles.cost.toLocaleString())}`,
    `Underlayment: ${m.underlayment.quantity} roll(s) · $${escapeHtml(m.underlayment.cost.toLocaleString())}`,
    `Ice & Water: ${m.iceAndWater.quantity} roll(s) · $${escapeHtml(m.iceAndWater.cost.toLocaleString())}`,
    `Ridge Vent: ${m.ridgeVent.quantity} piece(s) · $${escapeHtml(m.ridgeVent.cost.toLocaleString())}`,
    `Ridge Cap: ${m.ridgeCap.quantity} bundle(s) · $${escapeHtml(m.ridgeCap.cost.toLocaleString())}`,
    `Starter Strip: ${m.starterStrip.quantity} bundle(s) · $${escapeHtml(m.starterStrip.cost.toLocaleString())}`,
    `Nails: ${m.nails.quantity} lb · $${escapeHtml(m.nails.cost.toLocaleString())}`,
  ];

  return `
    <div class="section">
      <h2>Materials & labor breakdown</h2>
      <div class="grid2">
        <div><div class="label">Final Total</div><div class="value">$${escapeHtml(ev.totals.final.toLocaleString())}</div></div>
        <div><div class="label">Labor Total</div><div class="value">$${escapeHtml(ev.labor.total.toLocaleString())}</div></div>
      </div>
      <div style="margin-top:10px;">
        <div class="label">Materials (quantities & costs)</div>
        <ul>
          ${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}
        </ul>
      </div>
      <div class="muted" style="margin-top:10px;">
        Materials Total: $${escapeHtml(m.total.toLocaleString())} · Subtotal: $${escapeHtml(ev.totals.subtotal.toLocaleString())} · Overhead: $${escapeHtml(ev.additional.overhead.toLocaleString())} · Profit: $${escapeHtml(ev.additional.profit.toLocaleString())}
      </div>
    </div>
  `;
}

function renderScopeOfWork(report: DamageRoofReport) {
  const lines = report.scopeOfWork ?? [];
  if (!lines.length) return "";
  return `
    <div class="section">
      <h2>Scope of work</h2>
      <div class="muted" style="margin-bottom:8px;">
        Roof system: ${escapeHtml(report.roofType || "Not specified")}
        ${report.roofSystemCategory ? ` (${escapeHtml(report.roofSystemCategory)})` : ""}
      </div>
      <ul>
        ${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}
      </ul>
    </div>
  `;
}

/** Roofr-style key figures strip (squares, area, perimeter, pitch). */
function renderMeasurementStatsStrip(report: DamageRoofReport): string {
  const m = report.measurements;
  const area = m?.roofAreaSqFt;
  const perim = m?.roofPerimeterFt;
  const pitch = m?.roofPitch?.trim();
  const squares =
    area != null && Number.isFinite(area) ? (area / 100).toFixed(2) : "—";
  const areaStr =
    area != null && Number.isFinite(area)
      ? `${Math.round(area).toLocaleString()}`
      : "—";
  const perimStr =
    perim != null && Number.isFinite(perim)
      ? `${Math.round(perim).toLocaleString()}`
      : "—";
  const pitchStr = pitch ? escapeHtml(pitch) : "—";
  const waste =
    report.materialRequirements?.wastePct != null
      ? `${escapeHtml(String(report.materialRequirements.wastePct))}%`
      : "—";

  return `
    <div class="statsStrip">
      <div class="statCard"><div class="statVal">${escapeHtml(squares)}</div><div class="statLbl">Roof squares</div></div>
      <div class="statCard"><div class="statVal">${areaStr}</div><div class="statLbl">Area (sq ft)</div></div>
      <div class="statCard"><div class="statVal">${perimStr}</div><div class="statLbl">Perimeter (ft)</div></div>
      <div class="statCard"><div class="statVal">${pitchStr}</div><div class="statLbl">Pitch</div></div>
      <div class="statCard"><div class="statVal">${waste}</div><div class="statLbl">Waste % (est.)</div></div>
    </div>
  `;
}

function renderPropertyMeasurementKbHtml(): string {
  const lines = propertyMeasurementKbExportLines();
  return `
    <div class="section">
      <h2>Reference measurement reports (knowledge base)</h2>
      <p class="muted">Example Minnesota property PDFs are bundled in the HD2D app — open from the report editor or preview to view full documents.</p>
      <ul>
        ${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function renderIbcChapter15KbHtml(): string {
  const groupsHtml = IBC_CHAPTER_15_SECTION_GROUPS.map(
    (g) => `
    <div style="margin-top:14px;">
      <div class="label" style="margin-bottom:6px;">${escapeHtml(g.heading)}</div>
      <ul style="margin:0 0 0 18px;line-height:1.45;font-size:13px;">
        ${g.items.map((it) => `<li>${escapeHtml(`${it.ref}: ${it.summary}`)}</li>`).join("")}
      </ul>
    </div>`,
  ).join("");

  return `
    <div class="section">
      <h2>${escapeHtml(IBC_CHAPTER_15_KB_TITLE)}</h2>
      <p class="muted">${escapeHtml(IBC_CHAPTER_15_KB_DISCLAIMER)}</p>
      <p class="muted" style="margin-top:8px;font-size:12px;line-height:1.45;">${escapeHtml(IBC_CHAPTER_15_TYPICAL_EDITION_NOTE)}</p>
      ${groupsHtml}
    </div>
  `;
}

function renderIrcChapter8KbHtml(): string {
  const groupsHtml = IRC_CHAPTER_8_SECTION_GROUPS.map(
    (g) => `
    <div style="margin-top:14px;">
      <div class="label" style="margin-bottom:6px;">${escapeHtml(g.heading)}</div>
      <ul style="margin:0 0 0 18px;line-height:1.45;font-size:13px;">
        ${g.items.map((it) => `<li>${escapeHtml(`${it.ref}: ${it.summary}`)}</li>`).join("")}
      </ul>
    </div>`,
  ).join("");

  return `
    <div class="section">
      <h2>${escapeHtml(IRC_CHAPTER_8_KB_TITLE)}</h2>
      <p class="muted">${escapeHtml(IRC_CHAPTER_8_KB_DISCLAIMER)}</p>
      <p class="muted" style="margin-top:8px;font-size:12px;line-height:1.45;">${escapeHtml(IRC_CHAPTER_8_TYPICAL_EDITION_NOTE)}</p>
      <p class="muted" style="margin-top:10px;line-height:1.45;">${escapeHtml(IRC_CHAPTER_8_ABOUT)}</p>
      ${groupsHtml}
    </div>
  `;
}

function renderIrcChapter9KbHtml(): string {
  const groupsHtml = IRC_CHAPTER_9_SECTION_GROUPS.map(
    (g) => `
    <div style="margin-top:14px;">
      <div class="label" style="margin-bottom:6px;">${escapeHtml(g.heading)}</div>
      <ul style="margin:0 0 0 18px;line-height:1.45;font-size:13px;">
        ${g.items.map((it) => `<li>${escapeHtml(`${it.ref}: ${it.summary}`)}</li>`).join("")}
      </ul>
    </div>`,
  ).join("");

  return `
    <div class="section">
      <h2>${escapeHtml(IRC_CHAPTER_9_KB_TITLE)}</h2>
      <p class="muted">${escapeHtml(IRC_CHAPTER_9_KB_DISCLAIMER)}</p>
      <p class="muted" style="margin-top:8px;font-size:12px;line-height:1.45;">${escapeHtml(IRC_CHAPTER_9_TYPICAL_EDITION_NOTE)}</p>
      <p class="muted" style="margin-top:10px;line-height:1.45;">${escapeHtml(IRC_CHAPTER_9_ABOUT)}</p>
      ${groupsHtml}
    </div>
  `;
}

function renderMoIrcInsuranceKbHtml(): string {
  const groupsHtml = MO_IRC_INSURANCE_SECTION_GROUPS.map(
    (g) => `
    <div style="margin-top:14px;">
      <div class="label" style="margin-bottom:6px;">${escapeHtml(g.heading)}</div>
      <ul style="margin:0 0 0 18px;line-height:1.45;font-size:13px;">
        ${g.items.map((it) => `<li>${escapeHtml(`${it.ref}: ${it.summary}`)}</li>`).join("")}
      </ul>
    </div>`,
  ).join("");

  return `
    <div class="section">
      <h2>${escapeHtml(MO_IRC_INSURANCE_KB_TITLE)}</h2>
      <p class="muted">${escapeHtml(MO_IRC_INSURANCE_KB_DISCLAIMER)}</p>
      <p class="muted" style="margin-top:8px;font-size:12px;line-height:1.45;">${escapeHtml(MO_IRC_INSURANCE_TYPICAL_EDITION_NOTE)}</p>
      <p class="muted" style="margin-top:10px;line-height:1.45;">${escapeHtml(MO_IRC_INSURANCE_ABOUT)}</p>
      ${groupsHtml}
    </div>
  `;
}

function renderCommercialRoofTaxHtml(report: DamageRoofReport): string {
  if (!commercialRoofTaxNotesApplyToReport(report)) return "";

  const groupsHtml = COMMERCIAL_ROOF_TAX_SECTION_GROUPS.map(
    (g) => `
    <div style="margin-top:14px;">
      <div class="label" style="margin-bottom:6px;">${escapeHtml(g.heading)}</div>
      <ul style="margin:0 0 0 18px;line-height:1.45;font-size:13px;">
        ${g.items.map((it) => `<li>${escapeHtml(`${it.ref}: ${it.summary}`)}</li>`).join("")}
      </ul>
    </div>`,
  ).join("");

  return `
    <div class="section">
      <h2>${escapeHtml(COMMERCIAL_ROOF_TAX_KB_TITLE)}</h2>
      <p class="muted">${escapeHtml(COMMERCIAL_ROOF_TAX_KB_DISCLAIMER)}</p>
      <p class="muted" style="margin-top:8px;font-size:12px;line-height:1.45;">${escapeHtml(COMMERCIAL_ROOF_TAX_KB_EDITION_NOTE)}</p>
      ${groupsHtml}
    </div>
  `;
}

function renderMaterialSystemAnalysis(report: DamageRoofReport): string {
  const a = report.materialSystemAnalysis;
  if (!a) return "";

  const agreementStyle =
    a.agreement === "conflict" ? "color:#b45309;font-weight:700;" : "";
  const rows = a.components
    .map(
      (c) => `
        <tr>
          <td>${escapeHtml(c.name)}</td>
          <td>${escapeHtml(c.purpose)}</td>
          <td>${escapeHtml(c.notes || "—")}</td>
        </tr>`,
    )
    .join("");

  return `
    <div class="section">
      <h2>Roof system analysis</h2>
      <p class="sectionLead">Automatic resolution from roof type field, material selection, pitch, and roof form.</p>
      <div class="muted" style="margin-bottom:10px;line-height:1.5;">
        <strong style="color:var(--roofr-ink);">${escapeHtml(a.systemLabel)}</strong><br/>
        Covering (from roof type): ${escapeHtml(a.coveringDescription)}<br/>
        Agreement: <span style="${agreementStyle}">${escapeHtml(a.agreement)}</span><br/>
        <span style="font-size:12px;">Roof type field: ${escapeHtml(a.sources.roofTypeField)} · Material: ${escapeHtml(a.sources.materialSelector)}</span>
        ${
          report.materialSystemFieldVerified
            ? `<br/><span style="color:#15803d;font-weight:600;">Inspector confirmed roof type + material match field conditions.</span>`
            : ""
        }
      </div>
      ${
        typeof a.structuralLoadLbsPerSq === "number"
          ? `<div class="label" style="margin-top:8px;">Typical dead load (planning)</div>
      <div class="metaText" style="margin-bottom:8px;">~${escapeHtml(String(a.structuralLoadLbsPerSq))} lbs/sq — verify manufacturer and layers.</div>`
          : ""
      }
      ${
        a.geometryWasteNote
          ? `<div class="muted" style="margin-bottom:10px;font-size:13px;line-height:1.45;">${escapeHtml(a.geometryWasteNote)}</div>`
          : ""
      }
      ${
        a.reportAlerts?.length
          ? `<div class="label" style="margin-top:4px;">Knowledge base alerts</div><ul style="margin:6px 0 10px 18px;line-height:1.45;font-size:13px;">${a.reportAlerts.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`
          : ""
      }
      ${
        a.knowledgeBaseFigureRefs?.length
          ? `<div class="muted" style="font-size:12px;line-height:1.45;margin-bottom:10px;"><strong>References:</strong> ${a.knowledgeBaseFigureRefs.map((x) => escapeHtml(x)).join(" ")}</div>`
          : ""
      }
      <table class="compTable">
        <thead>
          <tr>
            <th>Component / layer</th>
            <th>Role in the system</th>
            <th>Field notes</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${
        a.layeringNotes.length
          ? `<div style="margin-top:12px;"><div class="label">Context</div><ul>${a.layeringNotes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul></div>`
          : ""
      }
      ${
        a.accuracyNotes.length
          ? `<div class="muted" style="margin-top:10px;font-size:12px;line-height:1.45;"><ul>${a.accuracyNotes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul></div>`
          : ""
      }
    </div>
  `;
}

function renderDamageSummarySection(report: DamageRoofReport): string {
  return `
    <div class="section">
      <h2>Damage & inspection summary</h2>
      <div class="grid2">
        <div>
          <div class="label">Severity</div>
          <div class="metaText">${escapeHtml(String(report.severity))}/5</div>
        </div>
        <div>
          <div class="label">Recommended action</div>
          <div class="metaText">${escapeHtml(report.recommendedAction)}</div>
        </div>
      </div>
      <div style="margin-top:10px;">
        <div class="label">Damage types</div>
        <ul>${renderDamageList(report.damageTypes)}</ul>
      </div>
      ${report.notes ? `<div class="muted" style="margin-top:10px; line-height:1.45;">${escapeHtml(report.notes)}</div>` : ""}
    </div>
  `;
}

export async function exportRoofReportToJson(
  report: DamageRoofReport,
  options?: ExportRoofReportOptions,
): Promise<void> {
  const onProgress = options?.onProgress;
  const filename = `RoofReport_${safeExportFilenamePart(report.id)}.json`;
  onProgress?.(8, "Preparing…");
  onProgress?.(25, "Serializing report…");
  const json = serializeRoofReportToJsonPretty(report);
  onProgress?.(70, "Encoding…");

  if (Platform.OS === "web") {
    onProgress?.(90, "Starting download…");
    const { downloadTextFileWebSync } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../utils/shareTextFile.web") as typeof import("../utils/shareTextFile.web");
    const r = downloadTextFileWebSync(filename, json, "application/json");
    if (!r.ok) throw new Error(r.error);
    onProgress?.(100, "Complete");
    return;
  }

  onProgress?.(85, "Opening share…");
  const result = await shareTextFile(filename, json, "application/json");
  if (!result.ok) {
    throw new Error(result.error);
  }
  onProgress?.(100, "Complete");
}

/** Full printable HTML (used by export and tests). */
export function buildRoofReportHtmlDocument(report: DamageRoofReport): string {
  const companyName = report.companyName || "Roof Inspection Co.";
  const creatorName = report.creatorName || report.createdBy?.name || "";
  const photosCount = report.images?.length ?? 0;
  const logoUrl = getCompanyLogoUrl(report);
  const intro = getIntroNarrative(companyName);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Roof measurement report — ${escapeHtml(report.property.address)}</title>
    <style>
      :root {
        --roofr-blue: #1e40af;
        --roofr-blue-light: #3b82f6;
        --roofr-ink: #0f172a;
        --roofr-muted: #64748b;
        --roofr-border: #e2e8f0;
        --roofr-surface: #f8fafc;
        --roofr-card: #ffffff;
      }
      * { box-sizing: border-box; }
      body {
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: var(--roofr-ink);
        margin: 0;
        background: var(--roofr-surface);
        line-height: 1.45;
      }
      .cover {
        background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #1d4ed8 100%);
        color: #fff;
        padding: 32px 28px 36px;
        box-shadow: 0 4px 24px rgba(30, 58, 138, 0.35);
      }
      .brandRow { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
      .logo { max-height: 56px; width: auto; object-fit: contain; border-radius: 8px; background: #fff; padding: 6px; }
      .brand { font-weight: 700; font-size: 15px; letter-spacing: 0.04em; text-transform: uppercase; opacity: 0.92; }
      .kicker { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.85; margin-bottom: 6px; }
      .title { font-size: clamp(26px, 4vw, 34px); font-weight: 800; margin: 0; letter-spacing: -0.02em; }
      .titleSub { margin-top: 10px; font-size: 14px; opacity: 0.92; max-width: 52rem; }
      .subtitle { margin-top: 16px; font-size: 13px; opacity: 0.88; line-height: 1.55; }
      .metaRow { margin-top: 22px; display: flex; flex-wrap: wrap; gap: 12px; }
      .chip {
        background: rgba(255,255,255,0.12);
        border: 1px solid rgba(255,255,255,0.28);
        border-radius: 10px;
        padding: 12px 14px;
        min-width: 180px;
        backdrop-filter: blur(6px);
      }
      .chip .label { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.85; display: block; margin-bottom: 4px; }
      .chip .metaText { font-size: 13px; margin: 0; }
      .intro {
        margin-top: 20px;
        padding: 14px 16px;
        background: rgba(255,255,255,0.1);
        border-radius: 10px;
        border-left: 4px solid rgba(255,255,255,0.65);
        font-size: 13px;
        line-height: 1.55;
      }
      .content { padding: 22px 24px 32px; max-width: 960px; margin: 0 auto; }
      .statsStrip {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 10px;
        margin-bottom: 8px;
      }
      .statCard {
        background: var(--roofr-card);
        border: 1px solid var(--roofr-border);
        border-radius: 12px;
        padding: 14px 12px;
        text-align: center;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
      }
      .statVal { font-size: 22px; font-weight: 800; color: var(--roofr-blue); letter-spacing: -0.02em; }
      .statLbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--roofr-muted); margin-top: 6px; }
      h2 {
        font-size: 17px;
        font-weight: 800;
        margin: 0 0 8px 0;
        color: var(--roofr-ink);
        padding-bottom: 8px;
        border-bottom: 2px solid var(--roofr-blue);
        display: inline-block;
        width: 100%;
      }
      .sectionLead { font-size: 13px; color: var(--roofr-muted); margin: 0 0 12px 0; }
      .section {
        background: var(--roofr-card);
        border: 1px solid var(--roofr-border);
        border-radius: 14px;
        padding: 18px 18px;
        margin-top: 16px;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      }
      .sectionHero { padding-bottom: 20px; }
      .heroImg {
        width: 100%;
        max-height: 360px;
        object-fit: cover;
        border-radius: 12px;
        border: 1px solid var(--roofr-border);
        background: #e2e8f0;
      }
      .diagramImg {
        width: 100%;
        max-height: 420px;
        object-fit: contain;
        border-radius: 12px;
        border: 1px solid var(--roofr-border);
        background: #f1f5f9;
      }
      .label { font-weight: 700; font-size: 12px; color: var(--roofr-muted); text-transform: uppercase; letter-spacing: 0.04em; }
      .metaText { font-size: 14px; color: var(--roofr-ink); margin-top: 4px; }
      .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .bullets { margin-top: 8px; }
      .check { margin-top: 10px; }
      .checkLabel { font-weight: 700; }
      .checkDetails { color: var(--roofr-muted); margin-top: 4px; line-height: 1.45; font-size: 13px; }
      ul { margin: 6px 0 0 18px; padding: 0; }
      .muted { color: var(--roofr-muted); }
      .footer {
        font-size: 12px;
        color: var(--roofr-muted);
        margin-top: 28px;
        padding-top: 16px;
        border-top: 1px solid var(--roofr-border);
        text-align: center;
      }
      .page { page-break-after: always; padding: 20px 24px; }
      .pageTitle { font-weight: 800; font-size: 15px; color: var(--roofr-blue); margin-bottom: 10px; }
      .photoGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      .photo { border: 1px solid var(--roofr-border); border-radius: 12px; padding: 8px; background: #fff; }
      .photo img { width: 100%; height: 140px; object-fit: cover; border-radius: 8px; background: #f1f5f9; }
      .photoCaption { font-size: 12px; margin-top: 8px; color: var(--roofr-muted); }
      .codeTable { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
      .codeTable th, .codeTable td { border: 1px solid var(--roofr-border); padding: 8px 10px; text-align: left; vertical-align: top; }
      .codeTable th { background: #eff6ff; font-weight: 700; color: var(--roofr-ink); }
      .codeTable th:nth-child(2), .codeTable th:nth-child(3), .codeTable th:nth-child(4),
      .codeTable td:nth-child(2), .codeTable td:nth-child(3), .codeTable td:nth-child(4) { text-align: center; width: 54px; }
      .codeTable th:nth-child(5), .codeTable td:nth-child(5) { width: 70px; text-align: center; }
      .compTable { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
      .compTable th, .compTable td { border: 1px solid var(--roofr-border); padding: 8px 10px; text-align: left; vertical-align: top; }
      .compTable th { background: #eff6ff; font-weight: 700; color: var(--roofr-ink); }
      .compTable tr:nth-child(even) td { background: #fafbfc; }
      @media print {
        body { background: #fff; }
        .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .section { break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <div class="cover">
      <div class="brandRow">
        <div>
          <div class="kicker">Measurement report</div>
          <div class="brand">${escapeHtml(companyName)}</div>
          <p class="title">Roof measurement report</p>
          <p class="titleSub">Roof area, pitch, diagrams, material takeoff, and inspection notes in one printable report.</p>
        </div>
        ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(companyName)} logo" />` : ""}
      </div>
      <div class="subtitle">
        <strong>Property</strong> ${escapeHtml(report.property.address)}<br/>
        <strong>Inspection date</strong> ${escapeHtml(report.inspectionDate)}
        &nbsp;·&nbsp; <strong>Report ID</strong> ${escapeHtml(report.id)}
        &nbsp;·&nbsp; <strong>Created</strong> ${escapeHtml(formatDate(report.createdAtIso))}
        <br/>
        <strong>Photos</strong> ${escapeHtml(photosCount.toString())}${creatorName ? ` &nbsp;·&nbsp; <strong>Inspector</strong> ${escapeHtml(creatorName)}` : ""}
      </div>
      <div class="intro">${escapeHtml(intro)}</div>

      <div class="metaRow">
        <div class="chip">
          <span class="label">Homeowner</span>
          <div class="metaText">${report.homeownerName ? escapeHtml(report.homeownerName) : "—"}</div>
        </div>
        <div class="chip">
          <span class="label">Contact</span>
          <div class="metaText">
            ${report.homeownerEmail ? `${escapeHtml(report.homeownerEmail)}<br/>` : ""}
            ${report.homeownerPhone ? escapeHtml(report.homeownerPhone) : ""}
            ${!report.homeownerEmail && !report.homeownerPhone ? "—" : ""}
          </div>
        </div>
        <div class="chip">
          <span class="label">Roof type</span>
          <div class="metaText">${report.roofType ? escapeHtml(report.roofType) : "—"}</div>
        </div>
        <div class="chip">
          <span class="label">Roof form</span>
          <div class="metaText">${report.roofFormType ? escapeHtml(report.roofFormType) : "—"}</div>
        </div>
        <div class="chip">
          <span class="label">Property use</span>
          <div class="metaText">${escapeHtml(
            formatPropertyUseLabel(
              report.propertyUse ?? report.property.propertyUse,
            ),
          )}</div>
        </div>
        <div class="chip">
          <span class="label">Coordinates</span>
          <div class="metaText">${report.property.lat.toFixed(6)}, ${report.property.lng.toFixed(6)}</div>
        </div>
      </div>
    </div>

    <div class="content">
      ${renderMeasurementStatsStrip(report)}
      ${renderPropertyMeasurementKbHtml()}
      ${
        showIbcChapter15Knowledge(
          report.propertyUse ?? report.property.propertyUse,
        )
          ? renderIbcChapter15KbHtml()
          : ""
      }
      ${
        showIrcChaptersKnowledge(
          report.propertyUse ?? report.property.propertyUse,
        )
          ? `${renderIrcChapter8KbHtml()}${renderIrcChapter9KbHtml()}${renderMoIrcInsuranceKbHtml()}`
          : ""
      }
      ${renderCommercialRoofTaxHtml(report)}
      ${renderPropertyImage(report)}
      ${renderRoofDiagram(report)}
      ${renderRoofPitchDiagram(report)}
      ${renderRoofLengthsDiagram(report)}
      ${renderRoofLidar3dDiagram(report)}
      ${renderMaterialRequirements(report)}
      ${renderMaterialSystemAnalysis(report)}
      ${renderLowSlopeMaterialEstimate(report)}
      ${renderCommercialFlatRoofInstructionsKb(report)}
      ${renderEagleViewEstimate(report)}
      ${renderDamageSummarySection(report)}
      ${renderEstimate(report.estimate, creatorName)}
      ${renderNonRoofEstimate(report.nonRoofEstimate, creatorName)}
      ${renderScheduleInspection(report)}
      ${renderMetarWeatherSection(report)}
      ${renderFieldQaSection(report)}
      ${renderAiDamageRisk(report)}
      ${renderScopeOfWork(report)}
      ${renderMeasurements(report.measurements)}
      ${renderBuildingCode(report.buildingCode, creatorName)}
      ${renderImages(report.images)}

      <div class="footer">
        HD2D roof reports — use <strong>Print → Save as PDF</strong> in your browser for a multi-page document.
      </div>
    </div>
  </body>
</html>`;
}

export async function exportRoofReportToHtml(
  report: DamageRoofReport,
  options?: ExportRoofReportOptions,
): Promise<void> {
  const onProgress = options?.onProgress;
  const filename = `RoofReport_${safeExportFilenamePart(report.id)}.html`;
  onProgress?.(4, "Preparing…");
  onProgress?.(12, "Building HTML…");
  const html = buildRoofReportHtmlDocument(report);
  onProgress?.(82, "Preparing file…");

  if (Platform.OS === "web") {
    onProgress?.(92, "Starting download…");
    const { downloadTextFileWebSync } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../utils/shareTextFile.web") as typeof import("../utils/shareTextFile.web");
    const r = downloadTextFileWebSync(filename, html, "text/html");
    if (!r.ok) throw new Error(r.error);
    onProgress?.(100, "Complete");
    return;
  }

  onProgress?.(88, "Opening share…");
  const result = await shareTextFile(filename, html, "text/html");
  if (!result.ok) {
    throw new Error(result.error);
  }
  onProgress?.(100, "Complete");
}

/** Download one HTML file per report (web). Small delay avoids browser download throttling. */
export async function exportBulkRoofReportsHtml(
  reports: DamageRoofReport[],
  delayMs = 280,
): Promise<void> {
  for (let i = 0; i < reports.length; i++) {
    await exportRoofReportToHtml(reports[i]);
    if (i < reports.length - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
