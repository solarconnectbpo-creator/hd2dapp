import { Platform } from "react-native";

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

function downloadTextFile(filename: string, content: string, mime: string) {
  if (typeof document === "undefined") return;

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
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

function renderDamageList(damageTypes: DamageType[]) {
  if (!damageTypes.length) return "<li>None selected</li>";
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

function renderBuildingCode(buildingCode?: BuildingCodeInfo, inspectorName?: string) {
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
      <h2>Building Code Checks</h2>
      <div class="muted">${escapeHtml(buildingCode.codeReference || "")}</div>
      ${buildingCode.jurisdiction ? `<div class="muted">${escapeHtml(buildingCode.jurisdiction)}</div>` : ""}
      <div class="bullets">
        ${checks
          .map(
            (c) =>
              `<div class="check"><div class="checkLabel">• ${escapeHtml(c.label)}</div>${
                c.details ? `<div class="checkDetails">${escapeHtml(c.details)}</div>` : ""
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
  const aerialRows: string[] = [];
  if (measurements.aerialMeasurementProvider?.trim()) {
    aerialRows.push(
      `<div><div class="label">Aerial measurement source</div><div class="value">${escapeHtml(
        measurements.aerialMeasurementProvider.trim(),
      )}</div></div>`,
    );
  }
  if (measurements.aerialMeasurementReference?.trim()) {
    aerialRows.push(
      `<div><div class="label">Aerial report / job ref</div><div class="value">${escapeHtml(
        measurements.aerialMeasurementReference.trim(),
      )}</div></div>`,
    );
  }
  if (measurements.aerialMeasurementReportUrl?.trim()) {
    const u = measurements.aerialMeasurementReportUrl.trim();
    aerialRows.push(
      `<div style="grid-column:1/-1;"><div class="label">Aerial report link</div><div class="value"><a href="${escapeHtml(
        u,
      )}" target="_blank" rel="noreferrer">${escapeHtml(u)}</a></div></div>`,
    );
  }
  const aerialBlock =
    aerialRows.length > 0
      ? `<div class="grid2" style="margin-top:12px;">${aerialRows.join("")}</div>`
      : "";

  return `
    <div class="section">
      <h2>Property Measurements</h2>
      <div class="grid2">
        <div><div class="label">Roof Area</div><div class="value">${
          measurements.roofAreaSqFt ? `${Math.round(measurements.roofAreaSqFt).toLocaleString()} sq ft` : "Not traced"
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
      ${aerialBlock}
      ${
        measurements.notes
          ? `<div class="muted" style="margin-top:10px;">${escapeHtml(measurements.notes)}</div>`
          : ""
      }
    </div>
  `;
}

function renderEstimate(estimate?: RoofDamageEstimate, inspectorName?: string) {
  if (!estimate) return "";
  const range = `$${estimate.lowCostUsd.toLocaleString()} - $${estimate.highCostUsd.toLocaleString()}`;

  return `
    <div class="section">
      <h2>Damage Estimate</h2>
      <div class="grid2">
        <div><div class="label">Scope</div><div class="metaText">${escapeHtml(estimate.scope.toUpperCase())}</div></div>
        <div><div class="label">Confidence</div><div class="metaText">${escapeHtml(estimate.confidence.toUpperCase())}</div></div>
      </div>
      <div style="margin-top:10px;">
        <div class="label">Estimated Range</div>
        <div class="metaText">${escapeHtml(range)}</div>
      </div>
      ${inspectorName ? `<div class="muted" style="margin-top:10px;">Inspector: ${escapeHtml(inspectorName)}</div>` : ""}
      ${estimate.notes ? `<div class="muted" style="margin-top:10px; line-height:1.45;">${escapeHtml(estimate.notes)}</div>` : ""}
    </div>
  `;
}

function renderNonRoofEstimate(nonRoof?: NonRoofLineItemsEstimate, inspectorName?: string) {
  if (!nonRoof) return "";
  const items: string[] = [];
  if (nonRoof.hvacUnits) items.push(`HVAC units replaced: ${nonRoof.hvacUnits}`);
  if (nonRoof.finCombUnits) items.push(`Condenser fin comb: ${nonRoof.finCombUnits}`);
  if (nonRoof.fenceCleanSqFt) items.push(`Fence clean: ${Math.round(nonRoof.fenceCleanSqFt).toLocaleString()} sq ft`);
  if (nonRoof.fenceStainSqFt) items.push(`Fence stain: ${Math.round(nonRoof.fenceStainSqFt).toLocaleString()} sq ft`);
  if (nonRoof.windowWrapSmallQty) items.push(`Window wrap small: ${nonRoof.windowWrapSmallQty}`);
  if (nonRoof.windowWrapStandardQty) items.push(`Window wrap standard: ${nonRoof.windowWrapStandardQty}`);
  if (nonRoof.houseWrapSqFt) items.push(`House wrap: ${Math.round(nonRoof.houseWrapSqFt).toLocaleString()} sq ft`);
  if (nonRoof.fanfoldSqFt) items.push(`Fanfold foam: ${Math.round(nonRoof.fanfoldSqFt).toLocaleString()} sq ft`);

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
  for (let i = 0; i < list.length; i += chunkSize) pages.push(list.slice(i, i + chunkSize));

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
      <h2>Photo Documentation</h2>
    </div>
    ${pageHtml}
  `;
}

function renderPropertyImage(report: DamageRoofReport) {
  if (!report.propertyImageUrl) return "";
  return `
    <div class="section">
      <h2>Property Image</h2>
      <img src="${escapeHtml(report.propertyImageUrl)}" alt="Property" style="width:100%;max-height:340px;object-fit:cover;border-radius:10px;background:#f3f4f6;" />
      <div class="muted" style="margin-top:8px;">Source: ${escapeHtml(report.propertyImageSource || "Map image")}</div>
    </div>
  `;
}

function renderRoofDiagram(report: DamageRoofReport) {
  if (!report.roofDiagramImageUrl) return "";
  const area = report.measurements?.roofAreaSqFt;
  const squares = area && Number.isFinite(area) ? (area / 100).toFixed(2) : undefined;
  return `
    <div class="section">
      <h2>Area Diagram</h2>
      <img src="${escapeHtml(report.roofDiagramImageUrl)}" alt="Roof diagram" style="width:100%;max-height:380px;object-fit:contain;border-radius:10px;background:#f8fafc;border:1px solid #e5e7eb;" />
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
      <h2>Pitches Diagram</h2>
      <img src="${escapeHtml(report.roofPitchDiagramImageUrl)}" alt="Pitches diagram" style="width:100%;max-height:380px;object-fit:contain;border-radius:10px;background:#f8fafc;border:1px solid #e5e7eb;" />
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
      <h2>Lengths Diagram</h2>
      <img src="${escapeHtml(report.roofLengthsDiagramImageUrl)}" alt="Lengths diagram" style="width:100%;max-height:380px;object-fit:contain;border-radius:10px;background:#f8fafc;border:1px solid #e5e7eb;" />
      <div class="muted" style="margin-top:8px;">
        ${escapeHtml(report.roofLengthsDiagramSource || "Generated from traced roof outline")}
      </div>
    </div>
  `;
}

function renderMaterialRequirements(report: DamageRoofReport) {
  const mr = report.materialRequirements;
  if (!mr) return "";

  const wastePctPart = typeof mr.wastePct === "number" ? ` (${escapeHtml(String(mr.wastePct))}%)` : "";
  const extrasHtml = mr.extras?.length ? mr.extras.map((e) => `<li>${escapeHtml(e)}</li>`).join("") : "";
  const extrasBlock = extrasHtml ? `<div style="margin-top:10px;"><div class="label">Extras to consider</div><ul>${extrasHtml}</ul></div>` : "";

  return `
    <div class="section">
      <h2>Material Requirements</h2>
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

function renderAiDamageRisk(report: DamageRoofReport) {
  const r = report.aiDamageRisk;
  if (!r) return "";

  const factorsHtml = r.factors?.length ? `<ul>${r.factors.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>` : "";
  const planHtml = r.actionPlan?.length ? `<ul>${r.actionPlan.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>` : "";

  return `
    <div class="section">
      <h2>Damage Risk (AI-style)</h2>
      <div class="grid2">
        <div><div class="label">Score</div><div class="value">${escapeHtml(String(r.score))}/100</div></div>
        <div><div class="label">Level</div><div class="value">${escapeHtml(String(r.level))}</div></div>
      </div>
      ${factorsHtml ? `<div style="margin-top:10px;"><div class="label">Factors</div>${factorsHtml}</div>` : ""}
      ${planHtml ? `<div style="margin-top:10px;"><div class="label">Action plan</div>${planHtml}</div>` : ""}
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
      <h2>EagleView-style Breakdown</h2>
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
      <h2>Scope of Work</h2>
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

export function exportRoofReportToJson(report: DamageRoofReport) {
  const filename = `RoofReport_${report.id}.json`;
  const json = JSON.stringify(report, null, 2);

  if (Platform.OS !== "web") {
    // For native we can wire a share/export flow later; for now avoid silent failure.
    return;
  }

  downloadTextFile(filename, json, "application/json");
}

export function exportRoofReportToHtml(report: DamageRoofReport) {
  const filename = `RoofReport_${report.id}.html`;

  const companyName = report.companyName || "Roof Inspection Co.";
  const creatorName = report.creatorName || report.createdBy?.name || "";
  const photosCount = report.images?.length ?? 0;
  const logoUrl = getCompanyLogoUrl(report);
  const intro = getIntroNarrative(companyName);

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Damage Roof Report</title>
    <style>
      :root{
        --brand:#f59e0b;
        --brand-dark:#b45309;
        --ink:#111827;
        --muted:#6b7280;
        --border:#e5e7eb;
      }
      body { font-family: Arial, Helvetica, sans-serif; color: var(--ink); margin: 0; background: #fff; }
      .cover { padding: 28px 28px; border-bottom: 6px solid var(--brand); background:linear-gradient(180deg,#fff8eb 0%,#fff 80%); }
      .brandRow { display:flex; align-items:center; justify-content:space-between; gap: 18px; }
      .logo { max-height: 62px; width: auto; object-fit: contain; border-radius: 8px; }
      .brand { color: var(--brand-dark); font-weight: 800; letter-spacing: .2px; font-size: 18px; }
      .title { font-size: 28px; font-weight: 900; margin-top: 10px; }
      .subtitle { color: var(--muted); margin-top: 8px; line-height: 1.4; font-size: 13px; }
      .metaRow { margin-top: 18px; display:flex; flex-wrap: wrap; gap: 16px; }
      .chip { border: 1px solid var(--border); border-radius: 12px; padding: 10px 12px; min-width: 210px; }
      .label { font-weight: 800; margin-right: 8px; }
      .metaText { font-size: 13px; color: var(--ink); margin-top: 4px; }
      .content { padding: 18px 28px 26px 28px; }
      h2 { font-size: 18px; margin: 0 0 10px 0; }
      .section { border: 1px solid var(--border); border-radius: 14px; padding: 14px 16px; margin-top: 14px; }
      .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .bullets { margin-top: 8px; }
      .check { margin-top: 10px; }
      .checkLabel { font-weight: 800; }
      .checkDetails { color: var(--muted); margin-top: 4px; line-height: 1.4; font-size: 13px; }
      ul { margin: 6px 0 0 18px; padding: 0; }
      .muted { color: var(--muted); }
      .photosTitle { margin-top: 14px; }
      .footer { font-size: 12px; color: #6b7280; margin-top: 18px; }
      .intro { margin-top: 14px; border-left: 4px solid var(--brand); padding-left: 12px; color: var(--ink); line-height: 1.55; }
      .page { page-break-after: always; padding: 20px 28px; }
      .pageTitle { font-weight: 900; font-size: 16px; color: var(--brand); margin-bottom: 10px; }
      .photoGrid { display:grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      .photo { border: 1px solid var(--border); border-radius: 12px; padding: 8px; }
      .photo img { width: 100%; height: 140px; object-fit: cover; border-radius: 8px; background: #f3f4f6; }
      .photoCaption { font-size: 12px; margin-top: 8px; color: var(--muted); }
      .codeTable { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
      .codeTable th, .codeTable td { border: 1px solid var(--border); padding: 6px 8px; text-align: left; vertical-align: top; }
      .codeTable th { background: #f9fafb; font-weight: 800; }
      .codeTable th:nth-child(2), .codeTable th:nth-child(3), .codeTable th:nth-child(4),
      .codeTable td:nth-child(2), .codeTable td:nth-child(3), .codeTable td:nth-child(4) { text-align: center; width: 54px; }
      .codeTable th:nth-child(5), .codeTable td:nth-child(5) { width: 70px; text-align: center; }
    </style>
  </head>
  <body>
    <div class="cover">
      <div class="brandRow">
        <div class="brand">${escapeHtml(companyName)}</div>
        ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(companyName)} logo" />` : ""}
      </div>
      <div class="title">Damage Roof Report</div>
      <div class="subtitle">
        Property: ${escapeHtml(report.property.address)}<br/>
        Inspection Date: ${escapeHtml(report.inspectionDate)}<br/>
        Report ID: ${escapeHtml(report.id)} | Created: ${escapeHtml(formatDate(report.createdAtIso))}<br/>
        Photos: ${escapeHtml(photosCount.toString())}${creatorName ? ` | Inspector: ${escapeHtml(creatorName)}` : ""}
      </div>
      <div class="intro">${escapeHtml(intro)}</div>

      <div class="metaRow">
        <div class="chip">
          <div class="label">Homeowner</div>
          <div class="metaText">${report.homeownerName ? escapeHtml(report.homeownerName) : "Not provided"}</div>
        </div>
        <div class="chip">
          <div class="label">Contact</div>
          <div class="metaText">
            ${report.homeownerEmail ? `Email: ${escapeHtml(report.homeownerEmail)}<br/>` : ""}
            ${report.homeownerPhone ? `Phone: ${escapeHtml(report.homeownerPhone)}<br/>` : ""}
            ${!report.homeownerEmail && !report.homeownerPhone ? "Not provided" : ""}
          </div>
        </div>
        <div class="chip">
          <div class="label">Roof Type</div>
          <div class="metaText">${report.roofType ? escapeHtml(report.roofType) : "Not provided"}</div>
        </div>
        <div class="chip">
          <div class="label">Roof Form</div>
          <div class="metaText">${report.roofFormType ? escapeHtml(report.roofFormType) : "Not provided"}</div>
        </div>
        <div class="chip">
          <div class="label">Coordinates</div>
          <div class="metaText">${report.property.lat.toFixed(6)}, ${report.property.lng.toFixed(6)}</div>
        </div>
      </div>
    </div>

    <div class="content">
      <div class="section">
        <h2>Damage Summary</h2>
        <div class="grid2">
          <div>
            <div class="label">Severity</div>
            <div class="metaText">${escapeHtml(String(report.severity))}/5</div>
          </div>
          <div>
            <div class="label">Recommended Action</div>
            <div class="metaText">${escapeHtml(report.recommendedAction)}</div>
          </div>
        </div>
        <div style="margin-top:10px;">
          <div class="label">Damage Types</div>
          <ul>${renderDamageList(report.damageTypes)}</ul>
        </div>
        ${report.notes ? `<div class="muted" style="margin-top:10px; line-height:1.45;">${escapeHtml(report.notes)}</div>` : ""}
      </div>

      ${renderEstimate(report.estimate, creatorName)}
      ${renderNonRoofEstimate(report.nonRoofEstimate, creatorName)}
      ${renderPropertyImage(report)}
      ${renderRoofDiagram(report)}
      ${renderRoofPitchDiagram(report)}
      ${renderRoofLengthsDiagram(report)}
      ${renderMaterialRequirements(report)}
      ${renderEagleViewEstimate(report)}
      ${renderAiDamageRisk(report)}
      ${renderScopeOfWork(report)}
      ${renderMeasurements(report.measurements)}
      ${renderBuildingCode(report.buildingCode, creatorName)}
      ${renderImages(report.images)}

      <div class="footer">
        Generated by HD2D Roof Reports. Save as PDF from your browser print dialog.
      </div>
    </div>
  </body>
</html>`;

  if (Platform.OS !== "web") {
    return;
  }

  downloadTextFile(filename, html, "text/html");
}

