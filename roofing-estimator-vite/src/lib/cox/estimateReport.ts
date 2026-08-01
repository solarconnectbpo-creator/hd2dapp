/**
 * Printable Atlas-style estimate report HTML (Good/Better/Best + package lines).
 */

import { formatPrice, pricingTiers, type CoxTierKey } from "./pricingTiers";
import type { CoxEstimateResult } from "./generateCoxEstimate";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildCoxEstimateReportHtml(
  result: CoxEstimateResult,
  selectedTier: CoxTierKey = "better",
): string {
  const tierRows = (["good", "better", "best"] as const)
    .map((key) => {
      const meta = pricingTiers[key];
      const active = key === selectedTier ? " class=\"active\"" : "";
      return `<tr${active}>
        <td>${esc(meta.name)} <span class="muted">(${esc(meta.warranty)})</span></td>
        <td class="r">${esc(formatPrice(result.estimate.subtotal[key]))}</td>
        <td class="r">${esc(formatPrice(result.estimate.tax[key]))}</td>
        <td class="r"><strong>${esc(formatPrice(result.estimate.total[key]))}</strong></td>
      </tr>`;
    })
    .join("");

  const catalogRows =
    result.lineItems.length === 0
      ? `<tr><td colspan="5" class="muted">No catalog reference lines.</td></tr>`
      : result.lineItems
          .map(
            (line) => `<tr>
          <td>${esc(line.code)}</td>
          <td>${esc(line.name)}</td>
          <td class="r">${line.quantity}</td>
          <td class="r">${esc(formatPrice(line.unitCost))}</td>
          <td class="r">${esc(formatPrice(line.totalCost))}</td>
        </tr>`,
          )
          .join("");

  const storyLabel =
    result.buildingType === "oneStory"
      ? "One story"
      : result.buildingType === "twoStory"
        ? "Two story"
        : "Three story";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Estimate — ${esc(result.projectName)}</title>
<style>
  body { font-family: "Segoe UI", system-ui, sans-serif; color: #111; margin: 32px; max-width: 820px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 28px 0 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #444; }
  .muted { color: #666; font-size: 13px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 16px 0 8px; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { border-bottom: 1px solid #ddd; padding: 8px 6px; text-align: left; }
  th { color: #555; font-weight: 600; font-size: 12px; text-transform: uppercase; }
  td.r, th.r { text-align: right; }
  tr.active { background: #f0f7ff; }
  .note { margin-top: 20px; font-size: 12px; color: #555; line-height: 1.45; }
  @media print { body { margin: 16px; } }
</style>
</head>
<body>
  <h1>Roof estimate</h1>
  <p class="muted">${esc(result.projectName)} · Generated ${esc(new Date(result.generatedAt).toLocaleString())}</p>

  <div class="meta">
    <div><strong>Roof area</strong><br />${result.roofArea.toLocaleString()} sf (${result.squares} SQ)</div>
    <div><strong>Pitch</strong><br />${esc(result.pitch)}</div>
    <div><strong>Building</strong><br />${esc(storyLabel)}</div>
    <div><strong>System</strong><br />${esc(result.roofSystem)}</div>
    <div><strong>Base $/SQ</strong><br />$${result.basePricePerSquare.toLocaleString()}</div>
    <div><strong>Tear-off</strong><br />${result.tearOffLayers} layer${result.tearOffLayers === 1 ? "" : "s"} (${esc(formatPrice(result.tearOffCost))})</div>
  </div>

  <h2>Package tiers (tax ${(result.taxRate * 100).toFixed(0)}%)</h2>
  <p class="muted">Package total = (squares × $/SQ + tear-off) × tier multiplier + tax. Selected: <strong>${esc(pricingTiers[selectedTier].name)}</strong>.</p>
  <table>
    <thead><tr><th>Tier</th><th class="r">Subtotal</th><th class="r">Tax</th><th class="r">Total</th></tr></thead>
    <tbody>${tierRows}</tbody>
  </table>

  <h2>Catalog reference (not package total)</h2>
  <p class="muted">SKU/labor catalog for material discussion. Package pricing above is the contract total.</p>
  <table>
    <thead><tr><th>Code</th><th>Item</th><th class="r">Qty</th><th class="r">Unit</th><th class="r">Ext</th></tr></thead>
    <tbody>${catalogRows}</tbody>
  </table>

  <p class="note">
    Base package ${esc(formatPrice(result.totalBasePrice))}
    (material ${esc(formatPrice(result.materialCost))}
    ${result.tearOffCost > 0 ? ` + tear-off ${esc(formatPrice(result.tearOffCost))}` : ""}).
    Atlas $/SQ bands: 1-story $575; 2-story $650–$750 by pitch; 3-story $800; TPO/mod-bit overrides.
  </p>
</body>
</html>`;
}

export function openCoxEstimateReport(
  result: CoxEstimateResult,
  selectedTier: CoxTierKey = "better",
): void {
  const html = buildCoxEstimateReportHtml(result, selectedTier);
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
