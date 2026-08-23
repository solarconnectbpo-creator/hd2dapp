import type { DamagePhoto, FieldProject } from "./fieldProjectTypes";

export type StormDamageBranding = {
  companyName?: string;
  companyAddress?: string;
  companyWebsite?: string;
  preparedBy?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoDataUrl?: string;
};

export type StormDamageReportSummary = {
  propertyLabel: string;
  generatedLabel: string;
  photoCount: number;
  analyzedCount: number;
  damageTypes: string[];
  peakSeverity: number;
  recommendedAction: string;
  executiveSummary: string;
  fieldNotes: string;
};

const MAX_EMBEDDED_PHOTOS = 24;

function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeFilenamePart(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/[^\w\s.-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
  return cleaned || "property";
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function summarizeProject(
  project: Pick<FieldProject, "name" | "address" | "photos" | "notes">,
): StormDamageReportSummary {
  const photos = project.photos;
  const withAi = photos.filter((p) => p.aiSummary);
  const allTypes = new Set<string>();
  let maxSeverity = 1;
  const actions = new Map<string, number>();

  for (const p of withAi) {
    const ai = p.aiSummary!;
    for (const t of ai.damageTypes) allTypes.add(t);
    if (ai.severity > maxSeverity) maxSeverity = ai.severity;
    actions.set(ai.recommendedAction, (actions.get(ai.recommendedAction) ?? 0) + 1);
  }

  let topAction = "Further Inspection";
  let topCount = 0;
  for (const [action, count] of actions) {
    if (count > topCount) {
      topAction = action;
      topCount = count;
    }
  }

  const damageTypes = [...allTypes];
  const propertyLabel = project.address?.trim() || project.name;
  const generatedLabel = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  let executiveSummary: string;
  if (withAi.length === 0) {
    executiveSummary =
      photos.length === 0
        ? "No site photos yet. Capture roof and elevation images to generate findings."
        : "Photos are on file. Analysis is pending or unavailable — findings will appear when analysis completes.";
  } else {
    executiveSummary =
      `Visible indicators suggest ${damageTypes.join(", ") || "possible storm-related wear"} ` +
      `with peak severity ${maxSeverity}/5 across ${withAi.length} analyzed photo(s). ` +
      `Recommended next step: ${topAction}. ` +
      `This is a visual assist only — a physical inspection is required before any claim or scope.`;
  }

  return {
    propertyLabel,
    generatedLabel,
    photoCount: photos.length,
    analyzedCount: withAi.length,
    damageTypes,
    peakSeverity: withAi.length ? maxSeverity : 0,
    recommendedAction: withAi.length ? topAction : "Further Inspection",
    executiveSummary,
    fieldNotes: project.notes?.trim() ?? "",
  };
}

/** Build a contractor-facing storm damage report from per-photo AI drafts. */
export function buildStormDamageReport(
  project: Pick<FieldProject, "name" | "address" | "photos" | "notes">,
): string {
  const summary = summarizeProject(project);
  const photos = project.photos;
  const lines: string[] = [];

  lines.push("STORM DAMAGE REPORT");
  lines.push("===================");
  lines.push(`Property: ${summary.propertyLabel}`);
  lines.push(`Generated: ${summary.generatedLabel}`);
  lines.push(`Photos documented: ${summary.photoCount}`);
  lines.push("");

  if (summary.analyzedCount === 0) {
    lines.push(summary.executiveSummary);
    if (summary.fieldNotes) {
      lines.push("");
      lines.push("Site notes");
      lines.push("----------");
      lines.push(summary.fieldNotes);
    }
    return lines.join("\n").slice(0, 8000);
  }

  lines.push("Executive summary");
  lines.push("-----------------");
  lines.push(summary.executiveSummary);
  lines.push("");

  lines.push("Observed damage types");
  lines.push("--------------------");
  lines.push(
    summary.damageTypes.length
      ? summary.damageTypes.map((t) => `• ${t}`).join("\n")
      : "• Further inspection needed",
  );
  lines.push("");

  lines.push("Recommended action");
  lines.push("------------------");
  lines.push(summary.recommendedAction);
  lines.push("");

  lines.push("Photo findings");
  lines.push("--------------");
  const ordered = [...photos].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  ordered.forEach((ph, i) => {
    lines.push(formatPhotoFinding(i + 1, ph));
    lines.push("");
  });

  lines.push("Disclaimer");
  lines.push("----------");
  lines.push(
    "AI drafts support field documentation and do not replace licensed inspection, engineering, or insurer determinations.",
  );

  if (summary.fieldNotes) {
    lines.push("");
    lines.push("Field notes");
    lines.push("-----------");
    lines.push(summary.fieldNotes);
  }

  return lines.join("\n").slice(0, 8000);
}

/**
 * Customer-facing plaintext suitable for email / SMS follow-up.
 * Softer language than the contractor field report.
 */
export function buildCustomerStormDamageReportText(
  project: Pick<FieldProject, "name" | "address" | "photos" | "notes">,
  branding: StormDamageBranding = {},
): string {
  const summary = summarizeProject(project);
  const company = branding.companyName?.trim() || "Your roofing contractor";
  const lines: string[] = [];

  lines.push("PROPERTY DAMAGE REPORT");
  lines.push("======================");
  lines.push(`Prepared for: ${summary.propertyLabel}`);
  lines.push(`Prepared by: ${company}`);
  if (branding.preparedBy?.trim()) lines.push(`Inspector: ${branding.preparedBy.trim()}`);
  if (branding.contactPhone?.trim()) lines.push(`Phone: ${branding.contactPhone.trim()}`);
  if (branding.contactEmail?.trim()) lines.push(`Email: ${branding.contactEmail.trim()}`);
  lines.push(`Date: ${summary.generatedLabel}`);
  lines.push(`Photos documented: ${summary.photoCount}`);
  lines.push("");

  lines.push("Summary");
  lines.push("-------");
  lines.push(summary.executiveSummary);
  lines.push("");

  if (summary.analyzedCount > 0) {
    lines.push("What we observed");
    lines.push("----------------");
    lines.push(
      summary.damageTypes.length
        ? summary.damageTypes.map((t) => `• ${t}`).join("\n")
        : "• Further inspection recommended",
    );
    lines.push("");
    lines.push("Recommended next step");
    lines.push("---------------------");
    lines.push(summary.recommendedAction);
    lines.push("");
  }

  const ordered = [...project.photos].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  if (ordered.length) {
    lines.push("Photo notes");
    lines.push("-----------");
    ordered.forEach((ph, i) => {
      const caption = ph.caption?.trim() || `Photo ${i + 1}`;
      if (ph.aiSummary) {
        lines.push(
          `${i + 1}. ${caption} — ${ph.aiSummary.summary} (Severity ${ph.aiSummary.severity}/5)`,
        );
      } else {
        lines.push(`${i + 1}. ${caption} — on file`);
      }
    });
    lines.push("");
  }

  if (summary.fieldNotes) {
    lines.push("Additional notes");
    lines.push("----------------");
    lines.push(summary.fieldNotes);
    lines.push("");
  }

  lines.push("Important");
  lines.push("---------");
  lines.push(
    "This report documents visible conditions from site photos and AI-assisted review. " +
      "It does not replace a licensed inspection, engineering evaluation, or insurer determination.",
  );

  return lines.join("\n").slice(0, 8000);
}

function photoCardsHtml(photos: DamagePhoto[]): string {
  const ordered = [...photos]
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
    .slice(0, MAX_EMBEDDED_PHOTOS);

  if (!ordered.length) {
    return `<p class="muted">No site photos attached yet.</p>`;
  }

  const cards = ordered
    .map((ph, i) => {
      const caption = escapeHtml(ph.caption?.trim() || `Photo ${i + 1}`);
      const when = escapeHtml(formatWhen(ph.capturedAt));
      const img =
        ph.imageDataUrl && ph.imageDataUrl.startsWith("data:image/")
          ? `<img src="${ph.imageDataUrl}" alt="${caption}" />`
          : `<div class="img-placeholder">Photo on file</div>`;
      const finding = ph.aiSummary
        ? `<p class="finding">${escapeHtml(ph.aiSummary.summary)}</p>
           <p class="meta">Severity ${escapeHtml(String(ph.aiSummary.severity))}/5 · ${escapeHtml(ph.aiSummary.recommendedAction)}</p>
           ${ph.aiSummary.notes?.trim() ? `<p class="notes">${escapeHtml(ph.aiSummary.notes.trim())}</p>` : ""}`
        : `<p class="muted">Documented on site.</p>`;
      return `<figure class="photo-card">
        ${img}
        <figcaption>
          <strong>${caption}</strong>
          <span class="when">${when}</span>
          ${finding}
        </figcaption>
      </figure>`;
    })
    .join("\n");

  const more =
    photos.length > ordered.length
      ? `<p class="muted">Showing ${ordered.length} of ${photos.length} photos in this customer packet.</p>`
      : "";

  return `<div class="photo-grid">${cards}</div>${more}`;
}

/**
 * Branded HTML packet for homeowners — open, print, or Save as PDF.
 */
export function buildCustomerStormDamageReportHtml(
  project: Pick<FieldProject, "name" | "address" | "photos" | "notes" | "aiReport">,
  branding: StormDamageBranding = {},
): string {
  const summary = summarizeProject(project);
  const company = branding.companyName?.trim() || "Property damage documentation";
  const title = `Damage report — ${summary.propertyLabel}`;

  const logo = branding.logoDataUrl?.startsWith("data:image/")
    ? `<img class="logo" src="${branding.logoDataUrl}" alt="${escapeHtml(company)}" />`
    : "";

  const contactBits = [
    branding.preparedBy?.trim() ? `Prepared by ${escapeHtml(branding.preparedBy.trim())}` : "",
    branding.contactPhone?.trim() ? escapeHtml(branding.contactPhone.trim()) : "",
    branding.contactEmail?.trim() ? escapeHtml(branding.contactEmail.trim()) : "",
    branding.companyWebsite?.trim() ? escapeHtml(branding.companyWebsite.trim()) : "",
  ].filter(Boolean);

  const addressLine = branding.companyAddress?.trim()
    ? `<p class="company-addr">${escapeHtml(branding.companyAddress.trim())}</p>`
    : "";

  const typesHtml = summary.damageTypes.length
    ? `<ul>${summary.damageTypes.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`
    : `<p class="muted">Further on-site inspection recommended.</p>`;

  const notesHtml = summary.fieldNotes
    ? `<section>
        <h2>Additional notes</h2>
        <p>${escapeHtml(summary.fieldNotes).replace(/\n/g, "<br />")}</p>
      </section>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 28px 24px 40px;
      color: #0f172a;
      background: #eef2f6;
      font-family: "Source Serif 4", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
      line-height: 1.55;
    }
    .sheet {
      max-width: 820px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #d7dee8;
      border-radius: 4px;
      padding: 36px 40px 44px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
    }
    .brand {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 18px;
      margin-bottom: 22px;
    }
    .logo { width: 72px; height: 72px; object-fit: contain; border-radius: 6px; }
    .brand h1 {
      margin: 0;
      font-size: 1.55rem;
      letter-spacing: -0.02em;
      font-weight: 700;
      line-height: 1.2;
    }
    .eyebrow {
      margin: 0 0 4px;
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      font-size: 0.72rem;
      font-weight: 650;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #334155;
    }
    .company-addr, .contacts, .meta-line {
      margin: 4px 0 0;
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      font-size: 0.84rem;
      color: #475569;
    }
    .contacts { margin-top: 8px; }
    h2 {
      margin: 26px 0 10px;
      font-size: 1.05rem;
      letter-spacing: -0.01em;
    }
    p { margin: 0 0 10px; }
    ul { margin: 0 0 10px; padding-left: 1.2rem; }
    .summary {
      background: #f8fafc;
      border-left: 4px solid #0f172a;
      padding: 14px 16px;
      margin: 0 0 8px;
    }
    .callout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 16px 0 8px;
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
    }
    .stat {
      background: #f1f5f9;
      border-radius: 6px;
      padding: 12px 14px;
    }
    .stat .label {
      display: block;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin-bottom: 4px;
    }
    .stat .value { font-size: 1.05rem; font-weight: 650; }
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      margin-top: 8px;
    }
    .photo-card {
      margin: 0;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
      background: #fff;
      break-inside: avoid;
    }
    .photo-card img, .img-placeholder {
      display: block;
      width: 100%;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      background: #e2e8f0;
    }
    .img-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      font-size: 0.8rem;
      color: #64748b;
    }
    figcaption { padding: 10px 12px 12px; font-family: "IBM Plex Sans", "Segoe UI", sans-serif; font-size: 0.82rem; }
    figcaption strong { display: block; margin-bottom: 2px; }
    .when, .meta, .muted, .notes { color: #64748b; }
    .finding { margin: 6px 0 2px; color: #0f172a; }
    .notes { margin: 4px 0 0; }
    .disclaimer {
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      font-size: 0.78rem;
      color: #64748b;
    }
    .print-hint {
      margin: 0 0 14px;
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      font-size: 0.78rem;
      color: #64748b;
    }
    @media (max-width: 640px) {
      body { padding: 12px; }
      .sheet { padding: 22px 18px 28px; }
      .callout, .photo-grid { grid-template-columns: 1fr; }
    }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { box-shadow: none; border: none; max-width: none; padding: 0; }
      .print-hint { display: none; }
      .photo-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <p class="print-hint">Tip: use your browser’s Print dialog and choose “Save as PDF” to send this to the customer.</p>
    <header class="brand">
      ${logo}
      <div>
        <p class="eyebrow">Customer damage report</p>
        <h1>${escapeHtml(company)}</h1>
        ${addressLine}
        ${contactBits.length ? `<p class="contacts">${contactBits.join(" · ")}</p>` : ""}
      </div>
    </header>

    <p class="meta-line"><strong>Property:</strong> ${escapeHtml(summary.propertyLabel)}</p>
    <p class="meta-line"><strong>Report date:</strong> ${escapeHtml(summary.generatedLabel)}</p>
    <p class="meta-line"><strong>Photos documented:</strong> ${summary.photoCount}</p>

    <section>
      <h2>Summary for the property owner</h2>
      <p class="summary">${escapeHtml(summary.executiveSummary)}</p>
    </section>

    <div class="callout">
      <div class="stat">
        <span class="label">Recommended next step</span>
        <span class="value">${escapeHtml(summary.recommendedAction)}</span>
      </div>
      <div class="stat">
        <span class="label">Peak severity</span>
        <span class="value">${summary.peakSeverity ? `${summary.peakSeverity} / 5` : "Pending analysis"}</span>
      </div>
    </div>

    <section>
      <h2>What we observed</h2>
      ${typesHtml}
    </section>

    <section>
      <h2>Photo documentation</h2>
      ${photoCardsHtml(project.photos)}
    </section>

    ${notesHtml}

    <p class="disclaimer">
      This packet documents visible conditions from site photos and AI-assisted review for the property owner.
      It does not replace a licensed inspection, engineering evaluation, or insurer determination.
      Generated for ${escapeHtml(summary.propertyLabel)}.
    </p>
  </div>
</body>
</html>`;
}

export function customerStormDamageReportFilename(
  project: Pick<FieldProject, "name" | "address">,
): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `damage-report-${safeFilenamePart(project.address || project.name)}-${stamp}.html`;
}

/** Download the customer HTML packet (open locally or attach to email). */
export function downloadCustomerStormDamageReportHtml(html: string, filename: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Open the customer packet and trigger Print → Save as PDF.
 * Returns false if the pop-up was blocked.
 */
export function printCustomerStormDamageReportHtml(html: string): boolean {
  const win = window.open("", "_blank", "width=980,height=900");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
  return true;
}

/**
 * HOA / board-facing damage discovery packet — framed to support a motion to file a claim.
 * Uses the same photo + AI evidence as the homeowner report, with fiduciary / reserve language.
 */
export function buildHoaBoardDiscoveryHtml(
  project: Pick<FieldProject, "name" | "address" | "photos" | "notes" | "aiReport">,
  branding: StormDamageBranding = {},
): string {
  const summary = summarizeProject(project);
  const company = branding.companyName?.trim() || "Field inspection team";
  const property = summary.propertyLabel;
  const types = summary.damageTypes.length
    ? summary.damageTypes.map((t) => `<li>${escapeHtml(t)}</li>`).join("")
    : "<li>Impact / storm-related wear — further carrier inspection recommended</li>";

  const logo = branding.logoDataUrl?.startsWith("data:image/")
    ? `<img class="logo" src="${branding.logoDataUrl}" alt="${escapeHtml(company)}" />`
    : "";

  const contactBits = [
    branding.preparedBy?.trim() ? escapeHtml(branding.preparedBy.trim()) : "",
    branding.contactPhone?.trim() ? escapeHtml(branding.contactPhone.trim()) : "",
    branding.contactEmail?.trim() ? escapeHtml(branding.contactEmail.trim()) : "",
  ].filter(Boolean);

  const motion = `That the Board of Directors authorize the filing of a property insurance claim for storm-related damage documented at ${property}; direct management to notify the carrier; and engage ${company} to present damage discovery exhibits, attend the adjuster inspection, and report back with carrier findings and recommended restoration scope — with the intent that covered storm damage not be paid solely from Association reserves.`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>HOA Damage Discovery — ${escapeHtml(property)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 24px 16px 48px; color: #12171f; background: #f7f5f1;
      font-family: "Source Serif 4", "Iowan Old Style", Palatino, Georgia, serif; line-height: 1.55;
    }
    .sheet {
      max-width: 880px; margin: 0 auto; background: #fff; border: 1px solid #d5dbe3;
      border-radius: 4px; overflow: hidden; box-shadow: 0 16px 36px rgba(18,23,31,0.08);
    }
    .cover {
      padding: 36px 40px 28px; color: #f8fafc;
      background: linear-gradient(135deg, #243447, #12171f);
    }
    .eyebrow {
      margin: 0 0 10px; font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; color: #c9d4e1;
    }
    .cover h1 { margin: 0; font-size: 2rem; letter-spacing: -0.03em; line-height: 1.15; max-width: 16ch; }
    .cover .lede { margin: 14px 0 0; max-width: 48ch; color: #d7e0ea; }
    .brand-row { display: flex; gap: 14px; align-items: center; margin-top: 22px; }
    .logo { width: 56px; height: 56px; object-fit: contain; border-radius: 6px; background: #fff; }
    .brand-meta { font-family: "IBM Plex Sans", "Segoe UI", sans-serif; font-size: 0.84rem; color: #c9d4e1; }
    .body { padding: 32px 40px 44px; }
    h2 { margin: 28px 0 10px; font-size: 1.25rem; color: #243447; letter-spacing: -0.02em; }
    h2:first-child { margin-top: 0; }
    p { margin: 0 0 12px; }
    ul { margin: 0 0 12px; padding-left: 1.2rem; }
    .ask {
      border-left: 5px solid #8b1e1e; background: #f3e6e4; padding: 14px 16px; margin: 0 0 18px;
    }
    .ask strong {
      display: block; font-family: "IBM Plex Sans", "Segoe UI", sans-serif; font-size: 0.72rem;
      letter-spacing: 0.12em; text-transform: uppercase; color: #8b1e1e; margin-bottom: 6px;
    }
    .stats {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 14px 0 18px;
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
    }
    .stat { border: 1px solid #d5dbe3; border-radius: 10px; padding: 12px; background: #fbfbfa; }
    .stat .n { display: block; font-size: 1.35rem; font-weight: 700; color: #243447; }
    .stat .l { display: block; margin-top: 2px; font-size: 0.7rem; color: #5b6573; text-transform: uppercase; letter-spacing: 0.06em; }
    .motion {
      border: 2px solid #243447; border-radius: 12px; padding: 16px; background: #f8fafc; margin: 12px 0;
    }
    .motion .label {
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif; font-size: 0.7rem; letter-spacing: 0.12em;
      text-transform: uppercase; font-weight: 700; color: #243447; margin: 0 0 8px;
    }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0; }
    .card { border: 1px solid #d5dbe3; border-radius: 10px; padding: 12px 14px; background: #fbfbfa; }
    .card h3 { margin: 0 0 6px; font-family: "IBM Plex Sans", "Segoe UI", sans-serif; font-size: 0.95rem; }
    .muted { color: #5b6573; }
    .sans { font-family: "IBM Plex Sans", "Segoe UI", sans-serif; }
    .photo-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 8px; }
    .photo-card { margin: 0; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; break-inside: avoid; }
    .photo-card img, .img-placeholder {
      display: block; width: 100%; aspect-ratio: 4/3; object-fit: cover; background: #e2e8f0;
    }
    .img-placeholder {
      display: flex; align-items: center; justify-content: center;
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif; font-size: 0.8rem; color: #64748b;
    }
    figcaption { padding: 10px 12px; font-family: "IBM Plex Sans", "Segoe UI", sans-serif; font-size: 0.82rem; }
    .disclaimer {
      margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0;
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif; font-size: 0.76rem; color: #5b6573;
    }
    .print-hint { font-family: "IBM Plex Sans", "Segoe UI", sans-serif; font-size: 0.78rem; color: #5b6573; margin: 0 0 12px; }
    @media (max-width: 640px) {
      .cover, .body { padding: 22px 16px; }
      .stats, .two, .photo-grid { grid-template-columns: 1fr; }
    }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { box-shadow: none; border: none; }
      .print-hint { display: none; }
      .cover, .ask, .stat, .motion, .card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="cover">
      <p class="eyebrow">Confidential · Board of Directors packet</p>
      <h1>Storm Damage Discovery Report</h1>
      <p class="lede">
        Documented storm-related impact with a clear recommendation to authorize an insurance claim
        so covered restoration is not paid solely from Association reserves.
      </p>
      <div class="brand-row">
        ${logo}
        <div class="brand-meta">
          <div><strong style="color:#fff">${escapeHtml(company)}</strong></div>
          <div>${escapeHtml(property)}</div>
          <div>${escapeHtml(summary.generatedLabel)}${contactBits.length ? ` · ${contactBits.join(" · ")}` : ""}</div>
        </div>
      </div>
    </header>
    <div class="body">
      <p class="print-hint">Tip: Print → Save as PDF, then attach site photos as numbered exhibits for the Board packet.</p>
      <div class="ask">
        <strong>Board ask — one sentence</strong>
        Authorize the Association to file a property insurance claim for sudden storm damage documented
        at this property and retain claim-support presentation for the adjuster inspection.
      </div>
      <div class="stats">
        <div class="stat"><span class="n">${summary.photoCount}</span><span class="l">Photos</span></div>
        <div class="stat"><span class="n">${summary.analyzedCount}</span><span class="l">AI-reviewed</span></div>
        <div class="stat"><span class="n">${summary.peakSeverity || "—"}/5</span><span class="l">Peak severity</span></div>
        <div class="stat"><span class="n">${summary.damageTypes.length || "—"}</span><span class="l">Damage types</span></div>
      </div>
      <h2>Why this matters to the Board</h2>
      <p>
        Roofs and related exterior components are shared capital assets. Soft-metal collateral,
        shingle bruising, and mechanical/opening impacts are the class of evidence carriers use to
        evaluate sudden storm damage — not ordinary aging alone.
      </p>
      <div class="two sans">
        <div class="card">
          <h3>If the Board files promptly</h3>
          <p class="muted" style="margin:0">Evidence stays fresh, owners see fiduciary action, and covered work can protect reserves.</p>
        </div>
        <div class="card">
          <h3>If the Board waits</h3>
          <p class="muted" style="margin:0">Impact points age faster; leak risk rises; late-notice arguments become easier for a carrier.</p>
        </div>
      </div>
      <h2>Executive findings</h2>
      <p>${escapeHtml(summary.executiveSummary)}</p>
      <h2>Observed damage types</h2>
      <ul>${types}</ul>
      <p class="sans"><strong>Recommended next step:</strong> ${escapeHtml(summary.recommendedAction)}</p>
      ${
        summary.fieldNotes
          ? `<h2>Field notes</h2><p>${escapeHtml(summary.fieldNotes).replace(/\n/g, "<br />")}</p>`
          : ""
      }
      <h2>Photo documentation</h2>
      ${photoCardsHtml(project.photos)}
      <h2>Suggested Board motion</h2>
      <div class="motion">
        <p class="label">Draft motion for minutes</p>
        <p style="margin:0"><strong>Motion:</strong> ${escapeHtml(motion)}</p>
      </div>
      <h2>Closing recommendation</h2>
      <p>
        Adopt the motion above, transmit this packet with exhibits, and calendar the adjuster inspection.
        Declining to file converts a potentially covered storm event into a self-funded capital project.
      </p>
      <p class="disclaimer">
        Board decision aid based on site photos and AI-assisted field documentation. Not a public adjusting engagement,
        legal opinion, engineering certification, or coverage guarantee. Coverage depends on the Association policy and carrier determination.
        Prepared by ${escapeHtml(company)} for ${escapeHtml(property)}.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function hoaBoardDiscoveryFilename(project: Pick<FieldProject, "name" | "address">): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `hoa-damage-discovery-${safeFilenamePart(project.address || project.name)}-${stamp}.html`;
}

function formatPhotoFinding(index: number, ph: DamagePhoto): string {
  const when = formatWhen(ph.capturedAt);
  const caption = ph.caption?.trim() || `Photo ${index}`;
  if (!ph.aiSummary) {
    return `${index}. ${caption} (${when})\n   Analysis pending.`;
  }
  const ai = ph.aiSummary;
  return (
    `${index}. ${caption} (${when})\n` +
    `   ${ai.summary}\n` +
    `   Types: ${ai.damageTypes.join(", ") || "—"}; Severity ${ai.severity}/5; Action: ${ai.recommendedAction}\n` +
    `   ${ai.notes}`
  );
}
