import {
  CORVUS_PRO_SOLAR,
  COX_MO_SOLAR_COMPANY,
  corvusAddressBlock,
  corvusLicenseDisplay,
  coxMoSolarAddressBlock,
  coxMoSolarFooterLine,
} from "./coxMoSolarCompany";
import type { CoxMoSolarContractFields } from "./coxMoSolarContractTypes";

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function blank(v: string, fallback = "______________________________"): string {
  const t = (v || "").trim();
  return t ? esc(t) : fallback;
}

function fieldCell(label: string, value: string): string {
  return `<div class="field"><span class="lab">${esc(label)}</span><span class="val">${blank(value, "—")}</span></div>`;
}

function parseWholeDollars(raw: string): number | null {
  const cleaned = (raw || "").replace(/[$,]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const TEENS = [
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function chunkToWords(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)]);
    if (n % 10) parts.push(ONES[n % 10]);
  } else if (n >= 10) {
    parts.push(TEENS[n - 10]);
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(" ");
}

/** Whole-dollar amount in words for the proposal-contract price line. */
export function dollarsInWords(raw: string): string {
  const n = parseWholeDollars(raw);
  if (n === null) return "";
  if (n === 0) return "Zero";
  if (n > 999_999_999) return "";
  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const rest = n % 1_000;
  const out: string[] = [];
  if (billions) out.push(`${chunkToWords(billions)} Billion`);
  if (millions) out.push(`${chunkToWords(millions)} Million`);
  if (thousands) out.push(`${chunkToWords(thousands)} Thousand`);
  if (rest) out.push(chunkToWords(rest));
  return out.join(" ");
}

const C = COX_MO_SOLAR_COMPANY;
const EC = CORVUS_PRO_SOLAR;

function sharedStyles(): string {
  return `
    @page { size: letter; margin: 0.45in 0.5in; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #1c1917;
      font-family: "Segoe UI", "Calibri", system-ui, -apple-system, sans-serif;
      font-size: 10.4px;
      line-height: 1.42;
      background: #fff;
    }
    h1 {
      margin: 0 0 6px;
      font-size: 17px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #9a3412;
      text-align: center;
    }
    h2 {
      margin: 12px 0 5px;
      font-size: 11.5px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #9a3412;
      border-bottom: 1.5px solid #c2410c;
      padding-bottom: 2px;
    }
    h3 {
      margin: 9px 0 4px;
      font-size: 11px;
      color: #1c1917;
    }
    p { margin: 0 0 6px; }
    .brand {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 10px;
      align-items: start;
      margin-bottom: 8px;
      padding-bottom: 7px;
      border-bottom: 3px solid #c2410c;
    }
    .brand .name { font-size: 16px; font-weight: 800; color: #9a3412; letter-spacing: 0.04em; }
    .brand .tag { font-size: 9px; color: #57534e; }
    .brand .meta { font-size: 9.2px; color: #44403c; line-height: 1.4; }
    .brand .meta.right { text-align: right; }
    .logo-mark {
      width: 54px;
      height: 54px;
      margin: 0 auto;
      border-radius: 50%;
      background: radial-gradient(circle at 50% 38%, #fbbf24 0%, #ea580c 55%, #9a3412 100%);
      box-shadow: 0 0 0 3px #fed7aa;
    }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .fine { font-size: 9.3px; color: #44403c; }
    .callout {
      background: #fff7ed;
      border: 1px solid #fdba74;
      border-left: 4px solid #ea580c;
      padding: 6px 8px;
      margin: 7px 0;
    }
    .lien-box {
      border: 2px solid #1c1917;
      padding: 8px 9px;
      margin: 8px 0;
      font-size: 10pt;
      font-weight: 700;
      line-height: 1.35;
    }
    .grid2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 14px;
      margin: 6px 0;
    }
    .grid3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px 10px;
      margin: 6px 0;
    }
    .field .lab {
      display: block;
      font-size: 8.2px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #78716c;
    }
    .field .val {
      display: block;
      min-height: 16px;
      border-bottom: 1px solid #a8a29e;
      padding: 2px 0 3px;
      font-size: 11px;
      font-weight: 600;
    }
    .spec-box {
      min-height: 72px;
      border: 1px solid #d6d3d1;
      padding: 6px 8px;
      white-space: pre-wrap;
      font-size: 10.5px;
      background: #fafaf9;
    }
    .price-line {
      font-size: 12px;
      font-weight: 700;
      margin: 8px 0 4px;
    }
    .sig-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-top: 14px;
    }
    .sig-box {
      border-top: 1px solid #1c1917;
      padding-top: 4px;
      margin-top: 26px;
      font-size: 9.3px;
    }
    .check {
      margin: 7px 0;
      padding: 6px 8px;
      border: 1px solid #d6d3d1;
      background: #fafaf9;
    }
    .checkbox {
      display: inline-block;
      width: 11px;
      height: 11px;
      border: 1.5px solid #1c1917;
      margin-right: 6px;
      vertical-align: -2px;
    }
    ol.terms {
      margin: 0;
      padding-left: 18px;
      columns: 2;
      column-gap: 20px;
    }
    ol.terms li {
      break-inside: avoid;
      margin-bottom: 6px;
      font-size: 9px;
    }
    .footer-line {
      margin-top: 12px;
      padding-top: 5px;
      border-top: 1px solid #d6d3d1;
      font-size: 8.2px;
      color: #78716c;
    }
    .copy-tag {
      float: right;
      font-size: 8.5px;
      font-weight: 700;
      color: #c2410c;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .copies {
      text-align: center;
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #78716c;
      margin-top: 8px;
    }
    .disclaimer {
      font-size: 8.6px;
      font-style: italic;
      color: #44403c;
      border-top: 1px dashed #a8a29e;
      margin-top: 8px;
      padding-top: 5px;
    }
    ul.compact { margin: 4px 0 7px; padding-left: 16px; }
    ul.compact li { margin-bottom: 2px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;
}

function brandHeader(subtitle: string): string {
  return `
    <div class="brand">
      <div class="meta">
        ${esc(C.establishedLine)}<br/>
        ${esc(C.tagline)}<br/>
        ${esc(C.motto)}
      </div>
      <div style="text-align:center">
        <div class="logo-mark" aria-hidden="true"></div>
        <div class="name">${esc(C.legalName)}</div>
        <div class="tag">${esc(subtitle)}</div>
      </div>
      <div class="meta right">
        ${esc(C.website)}<br/>
        ${esc(C.email)}<br/>
        ${esc(C.phoneDisplay)}<br/>
        ${esc(C.addressLine1)}<br/>
        ${esc(C.cityStateZip)}
      </div>
    </div>`;
}

function licenseBanner(fields: CoxMoSolarContractFields): string {
  const license = corvusLicenseDisplay(fields.ecLicenseNumber);
  return `
    <p class="fine" style="text-align:center;margin-bottom:8px">
      <strong>Licensed Electrical Contractor:</strong> ${esc(EC.legalName)}
      &nbsp;·&nbsp; ${esc(EC.licenseType)} No. ${esc(license)}
      &nbsp;·&nbsp; ${esc(corvusAddressBlock())}
      &nbsp;·&nbsp; ${esc(EC.phoneDisplay)}
    </p>`;
}

function cancellationNotice(copyLabel: string, fields: CoxMoSolarContractFields): string {
  return `
  <section class="page">
    ${brandHeader("Missouri Home Solicitation Sale — Notice of Cancellation")}
    <span class="copy-tag">${esc(copyLabel)}</span>
    <h1>Notice of Cancellation</h1>
    <p class="fine">RSMo 407.700–407.720 · 16 C.F.R. Part 429 (FTC Cooling-Off Rule)</p>
    <p><strong>DATE OF TRANSACTION:</strong> ${blank(fields.contractDate)}</p>
    <p>You may CANCEL this transaction, without any Penalty or Obligation, within THREE BUSINESS DAYS from the above date. For this notice, a business day is any day except Saturday, Sunday, and legal holidays (RSMo 407.705).</p>
    <p>If you cancel, any property traded in, any payments made by you under the contract or sale, and any negotiable instrument executed by you will be returned within TEN BUSINESS DAYS following receipt by the seller of your cancellation notice, and any security interest arising out of the transaction will be cancelled.</p>
    <p>If you cancel, you must make available to the seller at your residence, in substantially as good condition as when received, any goods delivered to you under this contract or sale; or you may comply with the seller's written instructions regarding return shipment at the seller's expense and risk. If the seller does not pick up the goods within 20 days of the date of your Notice of Cancellation, you may retain or dispose of them without further obligation.</p>
    <p>To cancel this transaction, mail or deliver a signed and dated copy of this Cancellation Notice or any other written notice to <strong>${esc(C.legalName)}</strong> at ${esc(coxMoSolarAddressBlock())} — NOT LATER THAN MIDNIGHT OF THE THIRD BUSINESS DAY after the transaction date.</p>
    <p class="fine"><strong>${esc(C.shortName)}</strong><br/>${esc(coxMoSolarAddressBlock())}<br/>Phone: ${esc(C.phoneDisplay)} · ${esc(C.email)}</p>
    <h3>I HEREBY CANCEL THIS TRANSACTION.</h3>
    <div class="grid2">
      ${fieldCell("Date", "")}
      ${fieldCell("Buyer's Signature", "")}
      ${fieldCell("Print Name", fields.customerName)}
      ${fieldCell("Property Address", fields.streetAddress)}
      ${fieldCell("City, State, Zip", fields.cityStateZip)}
      ${fieldCell("Phone", fields.cellPhone || fields.homePhone)}
    </div>
    <div class="footer-line">${esc(coxMoSolarFooterLine())}</div>
  </section>`;
}

function contractFront(fields: CoxMoSolarContractFields): string {
  const sumNum = parseWholeDollars(fields.contractSum);
  const sumPrint = sumNum !== null && fields.contractSum.trim() ? `$${sumNum.toLocaleString("en-US")}` : "$__________";
  const words = dollarsInWords(fields.contractSum);
  const wordsPrint = words ? `${esc(words)} and 00/100` : "________________________________";
  const license = corvusLicenseDisplay(fields.ecLicenseNumber);

  return `
  <section class="page">
    ${brandHeader("Missouri Proposal — Contract")}
    ${licenseBanner(fields)}
    <h1>Proposal — Contract</h1>
    <div class="grid2">
      ${fieldCell("Buyer Name(s)", fields.customerName)}
      ${fieldCell("Date", fields.contractDate)}
      ${fieldCell("Address", fields.streetAddress)}
      ${fieldCell("City, State, Zip", fields.cityStateZip)}
      ${fieldCell("County", fields.county)}
      ${fieldCell("Email", fields.email)}
      ${fieldCell("Home Phone", fields.homePhone)}
      ${fieldCell("Cell Phone", fields.cellPhone)}
    </div>

    <h2>We hereby submit specifications and estimate for:</h2>
    <div class="grid3">
      ${fieldCell("System Size (kW DC)", fields.systemSizeKw)}
      ${fieldCell("Module Count", fields.panelCount)}
      ${fieldCell("Inverter / ESS", fields.inverter)}
    </div>
    <div class="spec-box">${fields.specifications.trim() ? esc(fields.specifications) : "&nbsp;"}</div>
    ${fields.exclusions.trim() ? `<p class="fine"><strong>Exclusions:</strong> ${esc(fields.exclusions)}</p>` : ""}

    <p class="price-line">We propose hereby to furnish material and labor — complete in accordance with the above specifications — for the sum of: ${sumPrint} &nbsp; (${wordsPrint} Dollars).</p>
    <p><strong>Payments to be made as follows:</strong></p>
    <div class="spec-box" style="min-height:36px">${fields.paymentTerms.trim() ? esc(fields.paymentTerms) : "&nbsp;"}</div>
    ${fields.financingNotes.trim() ? `<p class="fine"><strong>Financing notes:</strong> ${esc(fields.financingNotes)}</p>` : ""}
    ${fields.warranty.trim() ? `<p class="fine"><strong>Warranty (as written):</strong> ${esc(fields.warranty)}</p>` : ""}

    <p class="fine">Any alteration or deviation from the above specifications involving extra costs will be executed only upon written change order, and will become an extra charge over and above the contract sum. All agreements are contingent upon strikes, accidents, weather, utility or permitting delays, equipment availability, or other delays beyond ${esc(C.legalName)}'s control.</p>
    <p class="fine">This proposal may be withdrawn by us if not accepted within 3 days.</p>

    <div class="callout">
      <strong>NOTICE OF CANCELLATION (RSMo 407.710)</strong><br/>
      If this agreement was solicited at your residence and you do not want the goods or services, you may cancel, without further obligation, this agreement by mailing a notice to the seller at the address shown below, within 3 business days following the date of this transaction. Saturday, Sunday, and legal holidays are not business days. You shall return the goods to seller in substantially the same condition as when you obtained them. Seller will then cancel all contracts and negotiable instruments executed by you and return any property given by you to seller within 10 days. If seller does not pick up the purchased goods within 20 days from the date of your cancellation, you may retain or dispose of the goods without any further obligation. The notice must be mailed to:<br/>
      <strong>${esc(C.legalName)}</strong>, ${esc(coxMoSolarAddressBlock())}.
      See the attached Notice of Cancellation forms (2 copies).
    </div>

    <div class="lien-box">
      NOTICE TO OWNER<br/>
      FAILURE OF THIS CONTRACTOR TO PAY THOSE PERSONS SUPPLYING MATERIAL OR SERVICES TO COMPLETE THIS CONTRACT CAN RESULT IN THE FILING OF A MECHANIC'S LIEN ON THE PROPERTY WHICH IS THE SUBJECT OF THIS CONTRACT PURSUANT TO CHAPTER 429, RSMO. TO AVOID THIS RESULT YOU MAY ASK THIS CONTRACTOR FOR "LIEN WAIVERS" FROM ALL PERSONS SUPPLYING MATERIAL OR SERVICES FOR THE WORK DESCRIBED IN THIS CONTRACT. FAILURE TO SECURE LIEN WAIVERS MAY RESULT IN YOUR PAYING FOR LABOR AND MATERIAL TWICE.
    </div>

    <p>The undersigned Buyer authorizes ${esc(C.legalName)} and its licensed electrical contractor, ${esc(EC.legalName)} (Missouri ${esc(EC.licenseType)} No. ${esc(license)}), to apply for building, electrical, and utility interconnection permits and to perform the Work described above. This Proposal-Contract, the Terms &amp; Conditions, and any signed change orders are the entire agreement. Buyer acknowledges receipt of two (2) Notices of Cancellation and the mechanic's lien disclosure required by RSMo 429.012.</p>

    <div class="sig-row">
      <div>
        <div class="sig-box">Date of Acceptance</div>
      </div>
      <div>
        <div class="sig-box">Authorized Agent for ${esc(C.legalName)}</div>
        <p class="fine" style="margin-top:4px">${blank(fields.contractorRepName, "Print name")}</p>
      </div>
      <div>
        <div class="sig-box">Buyer / Homeowner Signature</div>
      </div>
      <div>
        <div class="sig-box">Buyer / Homeowner Signature (2nd, if applicable)</div>
      </div>
    </div>
    <p class="disclaimer">Purchaser acknowledges and agrees that ${esc(C.legalName)} does not state or imply that it is affiliated with a government entity or electrical utility company. Electrical installation is performed under ${esc(EC.legalName)}'s Missouri EC license.</p>
    <div class="copies">WHITE — LENDER &nbsp;·&nbsp; YELLOW — CONTRACTOR &nbsp;·&nbsp; PINK — HOMEOWNER</div>
    <div class="footer-line">${esc(coxMoSolarFooterLine())}</div>
  </section>`;
}

function termsBack(fields: CoxMoSolarContractFields): string {
  const license = corvusLicenseDisplay(fields.ecLicenseNumber);
  return `
  <section class="page">
    ${brandHeader("Missouri Acknowledgments, Disclosures &amp; Terms")}
    <h1>Acknowledgments &amp; Terms</h1>

    <h2>Purchaser acknowledges and agrees that:</h2>
    <ul class="compact fine">
      <li><strong>Affiliation.</strong> ${esc(C.legalName)} and ${esc(EC.legalName)} do not state or imply affiliation with any government entity, tax authority, or electrical utility company.</li>
      <li><strong>Utility costs.</strong> Neither company guarantees future utility rate increases, bill reductions, or specific savings. Production and savings depend on the purchaser's usage, shading, weather, equipment performance, utility tariffs, and net-metering or successor rates.</li>
      <li><strong>Tax credits.</strong> Any federal or state tax credit (including the federal residential clean energy credit) depends on the purchaser's individual tax situation. ${esc(C.legalName)} does not provide tax advice. Consult a qualified tax professional.</li>
      <li><strong>Rebates / incentives.</strong> Applying for and receiving utility rebates, SRECs, or other incentives is the purchaser's responsibility unless this Agreement expressly assigns that task in writing.</li>
      <li><strong>Warranties.</strong> Manufacturer warranties apply as published by the module, inverter, and racking manufacturers. Any workmanship warranty must be in writing. No other warranty is stated or implied except as required by Missouri law.</li>
      <li><strong>Utility interconnection.</strong> Permission to operate is granted by the serving electric supplier, not by ${esc(C.legalName)}. Buyer authorizes application under the Missouri Net Metering and Easy Connection Act (RSMo 386.890) where applicable. The system may not be energized until the utility issues written permission to operate.</li>
      <li><strong>HOA / covenants.</strong> Buyer is responsible for any homeowners-association architectural review. Missouri law (RSMo 442.012; RSMo 442.404) treats the use of solar energy as a property right and provides that deed restrictions and similar agreements may not prohibit rooftop solar collectors, though reasonable placement rules that do not impair function, use, or efficiency may apply.</li>
    </ul>

    <h2>Licensed electrical contractor</h2>
    <p>${esc(C.legalName)} sells and coordinates this solar energy system. Electrical contracting — including wiring, inverter connection, and interconnection — is performed by <strong>${esc(EC.legalName)}</strong>, ${esc(corvusAddressBlock())}, ${esc(EC.phoneDisplay)}, holding a <strong>${esc(EC.licenseType)}</strong>, License No. <strong>${esc(license)}</strong>. Qualifying electrical work is performed or supervised by a licensed electrician (master electrician of record: ${esc(EC.masterElectrician)}). Buyer may verify the current license status with the Missouri Office of Statewide Electrical Contractors / MOPRO licensee search.</p>

    <h2>Energy devices based on renewable sources (RSMo 442.012 &amp; 442.404)</h2>
    <p class="fine">The use of solar energy is a property right in Missouri (RSMo 442.012). Deed restrictions, indentures, covenants, or similar binding agreements cannot limit or prohibit, or have the effect of limiting or prohibiting, the installation of solar panels or solar collectors on the rooftop of any property or structure (RSMo 442.404). An association may adopt reasonable rules regarding placement that do not prevent installation or impair the functioning, use, or efficiency of the solar collection device.</p>

    <h2>Terms and conditions</h2>
    <ol class="terms">
      <li><strong>Work.</strong> Contractor shall furnish the materials and labor described in the specifications, subject to written change orders, required permits, utility approval, and site conditions.</li>
      <li><strong>Changes.</strong> Extra work is performed only on a written change order signed by Buyer and Contractor and is an extra charge over the contract sum.</li>
      <li><strong>Site access.</strong> Buyer shall provide safe access, working electrical service, and a suitable staging area, and shall disclose known roof, structural, or electrical deficiencies.</li>
      <li><strong>Existing conditions.</strong> Concealed or pre-existing defects (including roof decking, trusses, service-panel capacity, or knob-and-tube) are Buyer's responsibility unless included in the specifications. Contractor may suspend work until a change order is signed.</li>
      <li><strong>Roof / structure.</strong> Contractor is not the original roofing manufacturer. Roof penetrations are flashed in a workmanlike manner. Remaining roof life and leaks from pre-existing conditions are not warranted unless separately stated in writing.</li>
      <li><strong>Hazardous materials.</strong> Buyer assumes responsibility for asbestos, lead, mold, or other hazardous conditions discovered at the property.</li>
      <li><strong>Performance.</strong> Start and completion dates are estimates. Delays from weather, utilities, AHJs, labor, or equipment are not a breach.</li>
      <li><strong>Payment.</strong> Payments follow the schedule on the face of this Agreement. Final payment is due upon substantial completion and is a condition of any workmanship warranty. Past-due amounts may accrue interest at the lesser of 9% per annum or the maximum allowed by Missouri law, plus reasonable collection costs.</li>
      <li><strong>Cancellation.</strong> Buyer's statutory cancellation rights are set out on the face of this Agreement and the attached notices (RSMo 407.700–407.720). If Buyer cancels without a legal right to do so after the cancellation period, Contractor may recover the cost of work performed, non-returnable materials, restocking, permit fees, and a reasonable overhead charge.</li>
      <li><strong>Insurance.</strong> ${esc(EC.legalName)} and/or ${esc(C.legalName)} shall maintain commercial general liability and workers' compensation insurance as required for the Work.</li>
      <li><strong>Title / risk.</strong> Title to equipment passes as it is installed or as otherwise required by any lender. Buyer shall not remove equipment before final payment.</li>
      <li><strong>Production.</strong> Any production estimate is an estimate only, not a guarantee of kWh or dollar savings.</li>
      <li><strong>Governing law.</strong> This Agreement is governed by the laws of the State of Missouri. Venue lies in the Missouri county where the Property is located.</li>
      <li><strong>Entire agreement.</strong> This document, the specifications, and signed change orders are the entire agreement. Headings are for convenience only. If a provision is unenforceable, the remainder remains in effect.</li>
    </ol>
    <div class="check">
      <span class="checkbox"></span>
      Buyer confirms receipt of: (1) this Proposal-Contract; (2) two Notices of Cancellation; and (3) the RSMo 429.012 mechanic's lien notice printed in ten-point bold type on the face of this Agreement.
    </div>
    <div class="sig-row">
      <div>
        <div class="sig-box">Buyer Signature · Date</div>
        <p class="fine" style="margin-top:4px">${blank(fields.customerName, "Print name")}</p>
      </div>
      <div>
        <div class="sig-box">Buyer Signature (2nd) · Date</div>
      </div>
    </div>
    <div class="footer-line">${esc(coxMoSolarFooterLine())}</div>
  </section>`;
}

/**
 * Full printable Cox Solar Missouri packet:
 * 1) Proposal-Contract face (price, 3-day cancel, RSMo 429.012 lien)
 * 2) Acknowledgments, EC license, solar-rights, terms
 * 3–4) Notice of Cancellation (2 copies)
 */
export function buildCoxMoSolarContractHtml(fields: CoxMoSolarContractFields): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(C.legalName)} — Missouri Solar Proposal-Contract</title>
  <style>${sharedStyles()}</style>
</head>
<body>
${contractFront(fields)}
${termsBack(fields)}
${cancellationNotice("Copy 1 of 2 — Customer retains", fields)}
${cancellationNotice("Copy 2 of 2 — Customer retains", fields)}
</body>
</html>`;
}
