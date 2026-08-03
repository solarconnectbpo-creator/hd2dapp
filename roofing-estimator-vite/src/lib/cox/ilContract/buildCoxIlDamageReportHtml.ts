import { COX_IL_COMPANY } from "./coxIlCompany";
import { coxIlLetterheadHtml, coxIlLetterheadStyles } from "./coxIlLetterhead";
import { emptyCoxIlContractFields, type CoxIlContractFields } from "./coxIlContractTypes";

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function blank(v: string, fallback = ""): string {
  const t = (v || "").trim();
  return t ? esc(t) : fallback;
}

const ELEVATIONS = ["Front Elevation", "Right Elevation", "Back Elevation", "Left Elevation"] as const;
const ELEV_ITEMS = ["Roof", "Gutters", "Siding", "Fascia", "Soffit"] as const;
const MISC_ITEMS = ["Skylights", "Counter Flashing", "Chimney Flashing", "Ventilation"] as const;

/**
 * Cox IL Damage Report — Permission & Authorization contingency agreement.
 * Modeled on the Cox “Damage Report / Permission & Authorization” one-pager,
 * localized for Oak Brook / Illinois (no financing QR).
 */
export function buildCoxIlDamageReportHtml(
  fields?: Partial<CoxIlContractFields>,
  logoDataUrl?: string,
): string {
  const C = COX_IL_COMPANY;
  const f = emptyCoxIlContractFields(fields);
  const owner = blank(f.customerName);
  const phone = blank(f.primaryPhone);
  const address = [blank(f.lossAddress), blank(f.cityStateZip)].filter(Boolean).join(", ");
  const insurer = blank(f.insuranceCompany);
  const date = blank(f.contractDate || f.dateOfLoss);
  const claim = blank(f.claimNumber);
  const stormDate = blank(f.dateOfLoss);

  const elevCols = ELEVATIONS.map(
    (title) => `
      <div class="elev">
        <div class="elev-title">${esc(title)}</div>
        ${ELEV_ITEMS.map((item) => `<div class="elev-row"><span>${esc(item)}</span><span class="line"></span></div>`).join("")}
      </div>`,
  ).join("");

  const miscRows = MISC_ITEMS.map(
    (item) => `<div class="elev-row"><span>${esc(item)}</span><span class="line"></span></div>`,
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${esc(C.legalName)} — Damage Report Permission &amp; Authorization</title>
<style>
  @page { size: letter; margin: 0.32in 0.38in; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    color: #0f172a;
    font-size: 10.5px;
    line-height: 1.35;
    background: #fff;
    /* Faint flag-stripe atmosphere across the page */
    background-image: repeating-linear-gradient(
      90deg,
      rgba(220, 38, 38, 0.045) 0,
      rgba(220, 38, 38, 0.045) 72px,
      rgba(255, 255, 255, 0.96) 72px,
      rgba(255, 255, 255, 0.96) 144px
    );
  }
  ${coxIlLetterheadStyles()}
  .letterhead {
    margin-bottom: 8px;
    min-height: 104px;
  }
  .letterhead .logo-img { height: 90px; max-width: 230px; }
  .title {
    text-align: center;
    margin: 4px 0 10px;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 0.01em;
    color: #0f172a;
  }
  .info-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 0;
    border: 1.5px solid #0f172a;
    background: #fff;
  }
  .info-cell {
    display: grid;
    grid-template-columns: 118px 1fr;
    border-bottom: 1px solid #94a3b8;
    border-right: 1px solid #94a3b8;
    min-height: 28px;
  }
  .info-cell:nth-child(2n) { border-right: none; }
  .info-cell:nth-last-child(-n+2) { border-bottom: none; }
  .info-cell .lab {
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 5px 7px;
    background: #f1f5f9;
    border-right: 1px solid #cbd5e1;
    display: flex;
    align-items: center;
  }
  .info-cell .val {
    padding: 5px 8px;
    font-size: 11px;
    font-weight: 600;
    display: flex;
    align-items: center;
    min-height: 28px;
  }
  .banner {
    margin-top: 10px;
    background: #b91c1c;
    color: #fff;
    display: grid;
    grid-template-columns: 1.1fr 1.4fr 0.7fr;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    font-weight: 800;
  }
  .banner .storm {
    font-size: 11px;
    letter-spacing: 0.04em;
  }
  .banner .storm .uline {
    display: inline-block;
    min-width: 88px;
    border-bottom: 1.5px solid rgba(255,255,255,0.85);
    margin-left: 6px;
    padding: 0 4px 1px;
    font-weight: 700;
  }
  .banner .mid {
    text-align: center;
    font-size: 18px;
    letter-spacing: 0.08em;
  }
  .banner .key {
    text-align: right;
    font-size: 10px;
    line-height: 1.35;
    font-weight: 700;
  }
  .elev-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    border: 1.5px solid #0f172a;
    border-top: none;
    background: #fff;
  }
  .elev {
    padding: 7px 8px 8px;
    border-right: 1px solid #94a3b8;
  }
  .elev:last-child { border-right: none; }
  .elev-title {
    font-weight: 800;
    font-size: 11px;
    text-align: center;
    margin-bottom: 6px;
    color: #0b2a4a;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 4px;
  }
  .elev-row {
    display: grid;
    grid-template-columns: 62px 1fr;
    gap: 6px;
    align-items: end;
    margin: 5px 0;
    font-size: 10.5px;
    font-weight: 600;
  }
  .elev-row .line {
    border-bottom: 1px solid #64748b;
    min-height: 14px;
  }
  .misc-notes {
    display: grid;
    grid-template-columns: 1fr 1.35fr;
    gap: 14px;
    margin-top: 10px;
    background: rgba(255,255,255,0.88);
    border: 1px solid #cbd5e1;
    padding: 8px 10px;
  }
  .misc-notes h3 {
    margin: 0 0 6px;
    font-size: 12px;
    color: #0b2a4a;
  }
  .note-lines .nl {
    border-bottom: 1px solid #64748b;
    height: 18px;
    margin: 4px 0;
  }
  .auth {
    margin-top: 10px;
    display: grid;
    grid-template-columns: 1fr 120px;
    gap: 12px;
    align-items: start;
    background: rgba(255,255,255,0.9);
    border: 1px solid #cbd5e1;
    padding: 10px 12px;
  }
  .auth h3 {
    margin: 0 0 6px;
    font-size: 12.5px;
    color: #0f172a;
  }
  .auth ul {
    margin: 0;
    padding-left: 18px;
  }
  .auth li {
    margin: 3px 0;
    font-size: 10.5px;
  }
  .rating {
    border: 2px solid #1d4ed8;
    background: #eff6ff;
    color: #1e3a8a;
    text-align: center;
    padding: 10px 6px;
    border-radius: 4px;
  }
  .rating .grade {
    font-size: 28px;
    font-weight: 900;
    line-height: 1;
    color: #1d4ed8;
  }
  .rating .lbl {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.04em;
    margin-top: 4px;
  }
  .rating .sub {
    font-size: 8.5px;
    margin-top: 3px;
    color: #334155;
  }
  .copy {
    margin-top: 8px;
    font-size: 10px;
    line-height: 1.45;
    background: rgba(255,255,255,0.92);
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
  }
  .copy strong { font-weight: 800; }
  .sigs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    margin-top: 16px;
  }
  .sig {
    border-top: 1.5px solid #0f172a;
    padding-top: 4px;
    margin-top: 22px;
    font-size: 10px;
    font-weight: 700;
    color: #334155;
  }
  .sig .date {
    float: right;
    min-width: 90px;
  }
  .foot {
    margin-top: 10px;
    font-size: 8.5px;
    color: #64748b;
    text-align: center;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  ${coxIlLetterheadHtml({
    logoDataUrl,
    subtitle: "Damage Report · Permission & Authorization",
  })}

  <h1 class="title">Permission &amp; Authorization</h1>

  <div class="info-grid">
    <div class="info-cell"><div class="lab">Property Owner</div><div class="val">${owner}</div></div>
    <div class="info-cell"><div class="lab">Phone Number</div><div class="val">${phone}</div></div>
    <div class="info-cell"><div class="lab">Address, City, Zip</div><div class="val">${address}</div></div>
    <div class="info-cell"><div class="lab">Insurance Provider</div><div class="val">${insurer}</div></div>
    <div class="info-cell"><div class="lab">Date</div><div class="val">${date}</div></div>
    <div class="info-cell"><div class="lab">Claim Number</div><div class="val">${claim}</div></div>
  </div>

  <div class="banner">
    <div class="storm">STORM DATE<span class="uline">${stormDate || "&nbsp;"}</span></div>
    <div class="mid">DAMAGE REPORT</div>
    <div class="key">HAIL = H<br/>WIND = W</div>
  </div>
  <div class="elev-grid">${elevCols}</div>

  <div class="misc-notes">
    <div>
      <h3>Misc Items</h3>
      ${miscRows}
    </div>
    <div class="note-lines">
      <h3>Additional Notes</h3>
      <div class="nl"></div>
      <div class="nl"></div>
      <div class="nl"></div>
      <div class="nl"></div>
    </div>
  </div>

  <div class="auth">
    <div>
      <h3>I hereby authorize ${esc(C.legalName)} to:</h3>
      <ul>
        <li>Inspect and document the condition of my roof for up to one year</li>
        <li>Communicate directly with my insurance and mortgage company</li>
        <li>Obtain an “agreed price” of approval from my insurance</li>
        <li>Expedite the processes and paperwork required by my insurance and mortgage</li>
        <li>Proceed with repairs or replacement within 60 days of approval and funding</li>
      </ul>
    </div>
    <div class="rating" aria-label="A plus rating">
      <div class="grade">A+</div>
      <div class="lbl">RATING</div>
      <div class="sub">Customer satisfaction</div>
    </div>
  </div>

  <div class="copy">
    <p style="margin:0 0 7px">
      Filing a claim promptly helps ensure all storm-related damage is properly identified before it worsens or policy deadlines expire.
      ${esc(C.shortName)} meets the insurance adjuster on-site, documents all damage, and reviews the scope of work to help
      <strong>maximize</strong> the claim so repairs meet code and manufacturer requirements.
    </p>
    <p style="margin:0">
      By signing below, <strong>I understand this document does not restrict me solely to ${esc(C.legalName)}</strong>.
      ${esc(C.shortName)} has made me aware that I retain the right to select another contractor if I please.
      I understand that there are no charges for these inspection and documentation services.
      Contractor cannot act as a public adjuster. Illinois law (815 ILCS 513) prohibits contractors from paying or rebating insurance deductibles.
    </p>
  </div>

  <div class="sigs">
    <div class="sig">Property Owner Signature <span class="date">Date ____________</span></div>
    <div class="sig">${esc(C.shortName)} Rep Signature <span class="date">Date ____________</span></div>
  </div>
  <p class="foot">${esc(C.legalName)} · ${esc(C.addressLine1)}, ${esc(C.cityStateZip)} · ${esc(C.phoneDisplay)} · ${esc(C.website)}</p>
</body>
</html>`;
}
