import {
  COX_SOLAR_BRAND,
  COX_SOLAR_DISCLAIMER,
  COX_SOLAR_FAQ,
  COX_SOLAR_HOW_IT_WORKS,
  COX_SOLAR_INCENTIVES,
  COX_SOLAR_LEAVEBEHIND_BULLETS,
  COX_SOLAR_PROCESS,
  COX_SOLAR_WHY,
  coxSolarContactLine,
} from "./coxSolarMarketingContent";

export type CoxSolarMarketingHtmlVariant = "guide" | "leavebehind";

export type CoxSolarMarketingHtmlOptions = {
  /** Logo URL or data URI. Defaults to the public Cox lockup path. */
  logoSrc?: string;
};

const DEFAULT_LOGO_SRC = "/cox-solar-solutions-logo.png";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** House / sun / grid diagram for net-energy-metering education (original artwork). */
export function coxSolarNemDiagramSvg(opts?: { dark?: boolean }): string {
  const stroke = opts?.dark ? "#e8eef6" : "#0f2744";
  const muted = opts?.dark ? "#9eb0c4" : "#5b6b7c";
  const sun = "#e2a126";
  const house = opts?.dark ? "#1b3a5c" : "#c8102e";
  return `<svg viewBox="0 0 640 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Solar production flowing to the home and extra power exporting to the utility grid">
  <circle cx="72" cy="56" r="28" fill="${sun}"/>
  <g stroke="${sun}" stroke-width="4" stroke-linecap="round">
    <line x1="72" y1="14" x2="72" y2="4"/><line x1="72" y1="108" x2="72" y2="118"/>
    <line x1="30" y1="56" x2="20" y2="56"/><line x1="114" y1="56" x2="124" y2="56"/>
    <line x1="42" y1="26" x2="34" y2="18"/><line x1="102" y1="26" x2="110" y2="18"/>
    <line x1="42" y1="86" x2="34" y2="94"/><line x1="102" y1="86" x2="110" y2="94"/>
  </g>
  <polygon points="160,118 250,58 340,118" fill="${house}"/>
  <rect x="178" y="118" width="144" height="78" fill="${house}"/>
  <rect x="232" y="148" width="36" height="48" fill="#f4f7fb"/>
  <rect x="194" y="132" width="28" height="22" fill="#f4f7fb"/>
  <rect x="278" y="132" width="28" height="22" fill="#f4f7fb"/>
  <line x1="348" y1="150" x2="470" y2="150" stroke="${muted}" stroke-width="3" stroke-dasharray="8 7"/>
  <circle cx="410" cy="150" r="10" fill="none" stroke="${stroke}" stroke-width="3"/>
  <path d="M404 150 h6 l4-8 4 16 4-8 h6" fill="none" stroke="${stroke}" stroke-width="2"/>
  <line x1="520" y1="70" x2="520" y2="196" stroke="${stroke}" stroke-width="6"/>
  <line x1="490" y1="88" x2="550" y2="88" stroke="${stroke}" stroke-width="5"/>
  <line x1="498" y1="108" x2="542" y2="108" stroke="${stroke}" stroke-width="5"/>
  <line x1="506" y1="128" x2="534" y2="128" stroke="${stroke}" stroke-width="5"/>
  <text x="72" y="210" text-anchor="middle" font-size="13" fill="${muted}" font-family="Georgia, serif">Sunlight</text>
  <text x="250" y="210" text-anchor="middle" font-size="13" fill="${muted}" font-family="Georgia, serif">Your home</text>
  <text x="520" y="210" text-anchor="middle" font-size="13" fill="${muted}" font-family="Georgia, serif">Utility grid</text>
</svg>`;
}

function sharedStyles(): string {
  return `
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #122033;
      background: #fff;
      font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
      font-size: 12.5pt;
      line-height: 1.45;
    }
    .page { padding: 28px 36px 32px; max-width: 880px; margin: 0 auto; }
    .brand-bar {
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 6px solid #c8102e; padding-bottom: 12px; margin-bottom: 18px;
    }
    .brand-bar img { height: 150px; width: auto; }
    .eyebrow { font-family: Inter, system-ui, sans-serif; letter-spacing: 0.14em; text-transform: uppercase; font-size: 10px; color: #c8102e; font-weight: 700; }
    h1 { font-size: 28px; line-height: 1.15; margin: 6px 0 8px; color: #0f2744; }
    h2 { font-size: 18px; color: #0f2744; margin: 22px 0 8px; border-left: 5px solid #c8102e; padding-left: 10px; }
    h3 { font-size: 13.5px; margin: 0 0 4px; color: #0f2744; }
    p { margin: 0 0 10px; }
    .pitch { font-size: 16px; color: #0f2744; font-weight: 600; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; }
    .card { border: 1px solid #d5dde6; border-radius: 8px; padding: 10px 12px; background: #f7f9fc; break-inside: avoid; }
    table { width: 100%; border-collapse: collapse; font-size: 11pt; }
    th, td { border-top: 1px solid #d5dde6; padding: 8px 8px 8px 0; vertical-align: top; text-align: left; }
    th { font-family: Inter, system-ui, sans-serif; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #5b6b7c; }
    .kind { font-family: Inter, system-ui, sans-serif; font-size: 10px; font-weight: 700; color: #c8102e; text-transform: uppercase; }
    .diagram { margin: 8px 0 16px; }
    .footer { margin-top: 22px; padding-top: 10px; border-top: 2px solid #0f2744; font-size: 10pt; color: #3d4d5f; }
    .disclaimer { font-size: 9pt; color: #5b6b7c; }
    .cta { background: #0f2744; color: #fff; padding: 12px 14px; border-radius: 8px; margin: 16px 0; }
    .cta strong { color: #fff; }
    .leave { text-align: center; padding-top: 24px; }
    .leave h1 { font-size: 32px; }
    .leave .pitch { font-size: 20px; max-width: 34em; margin: 12px auto 18px; }
    @page { size: letter; margin: 0.55in; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .page { padding: 0; max-width: none; }
      h2 { break-after: avoid; }
      .card, tr { break-inside: avoid; }
    }
  `;
}

function brandBar(logoSrc: string): string {
  return `<div class="brand-bar">
    <img src="${esc(logoSrc)}" alt="${esc(COX_SOLAR_BRAND.productName)}"/>
    <div style="text-align:right;font-family:Inter,system-ui,sans-serif;font-size:11px;color:#0f2744">
      <div class="eyebrow">${esc(COX_SOLAR_BRAND.productName)}</div>
      <div>${esc(COX_SOLAR_BRAND.phoneDisplay)}</div>
      <div>${esc(COX_SOLAR_BRAND.websiteDisplay)}</div>
    </div>
  </div>`;
}

function guideBody(logoSrc: string): string {
  const why = COX_SOLAR_WHY.map(
    (s) => `<div class="card"><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></div>`,
  ).join("");
  const how = COX_SOLAR_HOW_IT_WORKS.map(
    (s) => `<div class="card"><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></div>`,
  ).join("");
  const steps = COX_SOLAR_PROCESS.map(
    (s) => `<div class="card"><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></div>`,
  ).join("");
  const rows = COX_SOLAR_INCENTIVES.map(
    (i) => `<tr>
      <td><strong>${esc(i.name)}</strong><div class="kind">${esc(i.kindLabel)}</div></td>
      <td>${esc(i.summary)}</td>
    </tr>`,
  ).join("");
  const faq = COX_SOLAR_FAQ.map(
    (f) => `<div class="card"><h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p></div>`,
  ).join("");

  return `${brandBar(logoSrc)}
    <p class="eyebrow">Illinois homeowner guide</p>
    <h1>${esc(COX_SOLAR_BRAND.productName)}</h1>
    <p class="pitch">${esc(COX_SOLAR_BRAND.pitch)}</p>
    <p>${esc(COX_SOLAR_BRAND.tagline)} ${esc(COX_SOLAR_BRAND.motto)}.</p>

    <h2>What we do</h2>
    <p>Cox inspects or replaces the roof, then designs a solar system for that deck. Design, permits, installation, utility interconnection, and monitoring stay with us. You keep a dry home and a production number you can see on your bill.</p>

    <h2>Why homeowners go solar</h2>
    <div class="grid">${why}</div>

    <h2>How solar works</h2>
    <div class="grid">${how}</div>
    <h2>Net energy metering</h2>
    <p>Production you do not use is sent to the grid. The utility credits surplus energy on a 12-month cycle. Legacy Illinois systems (installed before January 1, 2025) generally receive full retail-rate credits. New systems receive supply-only credits under Smart Solar Billing.</p>
    <div class="diagram">${coxSolarNemDiagramSvg()}</div>

    <h2>Illinois &amp; Chicago programs</h2>
    <table>
      <thead><tr><th>Program</th><th>What it can mean for this house</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <h2>How a Cox install moves</h2>
    <div class="grid">${steps}</div>

    <h2>Questions we hear on the porch</h2>
    <div class="grid">${faq}</div>

    <div class="cta">
      <strong>Ready for a roof-first solar review?</strong>
      <p style="margin:6px 0 0">Call ${esc(COX_SOLAR_BRAND.phoneDisplay)} · ${esc(COX_SOLAR_BRAND.email)} · ${esc(COX_SOLAR_BRAND.addressLine1)}, ${esc(COX_SOLAR_BRAND.cityStateZip)}</p>
    </div>
    <div class="footer">
      <p>${esc(coxSolarContactLine())}</p>
      <p class="disclaimer">${esc(COX_SOLAR_DISCLAIMER)}</p>
    </div>`;
}

function leavebehindBody(logoSrc: string): string {
  const bullets = COX_SOLAR_LEAVEBEHIND_BULLETS.map((b) => `<li>${esc(b)}</li>`).join("");

  return `${brandBar(logoSrc)}
    <div class="leave">
      <p class="eyebrow">${esc(COX_SOLAR_BRAND.motto)}</p>
      <h1>${esc(COX_SOLAR_BRAND.productName)}</h1>
      <p class="pitch">${esc(COX_SOLAR_BRAND.pitch)}</p>
      <div class="diagram" style="max-width:560px;margin:0 auto 16px">${coxSolarNemDiagramSvg()}</div>
      <ul style="text-align:left;max-width:34em;margin:0 auto 18px;padding-left:1.2em">${bullets}</ul>
      <div class="cta">
        <strong>Call ${esc(COX_SOLAR_BRAND.phoneDisplay)}</strong>
        <p style="margin:6px 0 0">${esc(COX_SOLAR_BRAND.addressLine1)}, ${esc(COX_SOLAR_BRAND.cityStateZip)} · ${esc(COX_SOLAR_BRAND.websiteDisplay)}</p>
      </div>
      <p class="disclaimer">${esc(COX_SOLAR_DISCLAIMER)}</p>
    </div>`;
}

/** Printable Cox Roofing Solar homeowner guide or one-page leave-behind. */
export function buildCoxSolarMarketingHtml(
  variant: CoxSolarMarketingHtmlVariant = "guide",
  options?: CoxSolarMarketingHtmlOptions,
): string {
  const logoSrc = options?.logoSrc || DEFAULT_LOGO_SRC;
  const title =
    variant === "leavebehind"
      ? `${COX_SOLAR_BRAND.productName} — Illinois leave-behind`
      : `${COX_SOLAR_BRAND.productName} — Illinois homeowner guide`;
  const body = variant === "leavebehind" ? leavebehindBody(logoSrc) : guideBody(logoSrc);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${esc(title)}</title>
  <style>${sharedStyles()}</style>
</head>
<body>
  <article class="page">${body}</article>
</body>
</html>`;
}

export function openCoxSolarMarketingPrint(variant: CoxSolarMarketingHtmlVariant = "guide"): boolean {
  const html = buildCoxSolarMarketingHtml(variant);
  const win = window.open("", "_blank", "width=980,height=900");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.focus();
  window.setTimeout(() => win.print(), 250);
  return true;
}
