import { COX_IL_COMPANY } from "./coxIlCompany";

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Shared faint stripe + logo letterhead styles for Cox IL printable forms. */
export function coxIlLetterheadStyles(): string {
  return `
    .letterhead {
      display: flex;
      align-items: center;
      gap: 16px;
      background-color: #fff;
      background-image: repeating-linear-gradient(
        90deg,
        rgba(220, 38, 38, 0.12) 0,
        rgba(220, 38, 38, 0.12) 72px,
        rgba(255, 255, 255, 0.95) 72px,
        rgba(255, 255, 255, 0.95) 144px
      );
      color: #0b2a4a;
      padding: 8px 12px;
      min-height: 118px;
      border: 1px solid #e2e8f0;
      margin-bottom: 12px;
      overflow: visible;
    }
    .letterhead .logo-box {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      overflow: visible;
    }
    .letterhead .logo-img {
      display: block;
      width: auto;
      height: 100px;
      max-width: 248px;
      object-fit: contain;
      object-position: left center;
    }
    .letterhead .logo-wordmark {
      display: inline-flex;
      align-items: center;
      font-style: italic;
      font-weight: 800;
      letter-spacing: 0.03em;
      white-space: nowrap;
    }
    .letterhead .logo-wordmark .cox {
      color: #244891;
      font-size: 20px;
      padding: 5px 6px 5px 1px;
    }
    .letterhead .logo-wordmark .roof {
      color: #fff;
      background: #aa3530;
      font-size: 20px;
      padding: 5px 12px;
      display: inline-block;
      transform: skewX(-12deg);
    }
    .letterhead .brand-copy { flex: 1; min-width: 0; }
    .letterhead .brand-copy .name {
      margin: 0 0 3px;
      font-size: 16px;
      font-weight: 800;
      color: #0b2a4a;
    }
    .letterhead .brand-copy .sub {
      margin: 0 0 4px;
      font-size: 11px;
      font-weight: 700;
      color: #1e3a5f;
    }
    .letterhead .brand-copy p {
      margin: 0;
      font-size: 10.5px;
      line-height: 1.4;
      color: #1e293b;
    }
  `;
}

export function coxIlLogoHtml(logoDataUrl?: string): string {
  const src = (logoDataUrl || "").trim();
  if (src) {
    return `<img class="logo-img" src="${src}" alt="Cox Roofing" />`;
  }
  return `<div class="logo-wordmark" aria-label="Cox Roofing"><span class="cox">COX</span><span class="roof">ROOFING</span></div>`;
}

export function coxIlLetterheadHtml(opts: {
  logoDataUrl?: string;
  subtitle?: string;
  compact?: boolean;
}): string {
  const C = COX_IL_COMPANY;
  const subtitle = (opts.subtitle || "").trim();
  return `
    <header class="letterhead${opts.compact ? " compact" : ""}">
      <div class="logo-box">${coxIlLogoHtml(opts.logoDataUrl)}</div>
      <div class="brand-copy">
        <div class="name">${esc(C.legalName)}</div>
        ${subtitle ? `<div class="sub">${esc(subtitle)}</div>` : ""}
        <p>${esc(C.addressLine1)} | ${esc(C.cityStateZip)}</p>
        <p>${esc(C.phoneDisplay)} · ${esc(C.website)}</p>
      </div>
    </header>`;
}
