import { COX_IL_COMPANY } from "./coxIlCompany";

/** Polished Cox IL restoration contract form (front + T&Cs). */
export function buildCoxIlFormFrontHtml(logoDataUrl?: string): string {
  const C = COX_IL_COMPANY;
  const logoSrc = (logoDataUrl || "").trim();
  // Houses graphic + HTML wordmark so "COX ROOFING" is never clipped by the PNG crop.
  const logoHtml = logoSrc
    ? `<div class="logo-stack">
        <img class="logo-img" src="${logoSrc}" alt="" />
        <div class="logo-wordmark" aria-label="Cox Roofing">
          <span class="cox">COX</span><span class="roof">ROOFING</span>
        </div>
      </div>`
    : `<div class="logo-wordmark" aria-label="Cox Roofing"><span class="cox">COX</span><span class="roof">ROOFING</span></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${C.legalName} — Illinois Restoration Contract</title>
<style>
  @page { size: letter; margin: 0.38in 0.42in; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    color: #0f172a;
    font-size: 9.5px;
    line-height: 1.35;
    background: #fff;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    /* Faint wide red & white stripes (original Cox letterhead feel) */
    background-color: #fff;
    background-image: repeating-linear-gradient(
      90deg,
      rgba(220, 38, 38, 0.12) 0,
      rgba(220, 38, 38, 0.12) 72px,
      rgba(255, 255, 255, 0.95) 72px,
      rgba(255, 255, 255, 0.95) 144px
    );
    color: #0b2a4a;
    padding: 14px 14px 16px;
    min-height: 110px;
    overflow: visible;
    border: 1px solid #e2e8f0;
  }
  .logo-box {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px 0;
    background: transparent;
    overflow: visible;
  }
  .logo-stack {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    overflow: visible;
  }
  .logo-img {
    display: block;
    width: 200px;
    height: auto;
    max-height: 52px;
    object-fit: contain;
    object-position: left center;
  }
  .logo-wordmark {
    display: inline-flex;
    align-items: center;
    font-style: italic;
    font-weight: 800;
    letter-spacing: 0.03em;
    line-height: 1.15;
    white-space: nowrap;
    overflow: visible;
  }
  .logo-wordmark .cox {
    color: #1d4ed8;
    font-size: 18px;
    padding: 5px 6px 5px 1px;
    line-height: 1.2;
  }
  .logo-wordmark .roof {
    color: #fff;
    background: #dc2626;
    font-size: 18px;
    padding: 5px 12px;
    line-height: 1.2;
    display: inline-block;
  }
  .brand { flex: 1; min-width: 0; }
  .brand h1 {
    margin: 0 0 3px;
    font-size: 17px;
    font-weight: 800;
    letter-spacing: 0.01em;
    color: #0b2a4a;
  }
  .brand p { margin: 0; font-size: 10.5px; line-height: 1.4; color: #1e293b; }
  .grid {
    display: grid;
    grid-template-columns: 1.35fr 1fr 1fr;
    gap: 8px 10px;
    margin-top: 10px;
  }
  .field label {
    display: block;
    font-size: 8.5px;
    color: #64748b;
    margin-bottom: 2px;
    font-weight: 700;
    text-transform: none;
  }
  .field .box {
    border: 1px solid #94a3b8;
    background: #fff;
    min-height: 24px;
    border-radius: 2px;
  }
  .req { color: #dc2626; font-weight: 800; }
  .cols {
    display: grid;
    grid-template-columns: 1.12fr 0.88fr;
    gap: 12px;
    margin-top: 10px;
    align-items: start;
  }
  .section {
    background: #0b2a4a;
    color: #fff;
    font-weight: 800;
    font-size: 10.5px;
    letter-spacing: 0.06em;
    padding: 5px 8px;
    margin: 0 0 7px;
  }
  .muted { color: #334155; }
  .row-inline { margin: 5px 0 7px; }
  .check { margin: 2.5px 0; }
  .check i {
    display: inline-block;
    width: 10px;
    height: 10px;
    border: 1.25px solid #334155;
    margin-right: 5px;
    vertical-align: -1px;
    background: #fff;
  }
  .subhead { font-weight: 800; margin: 7px 0 3px; font-size: 9.5px; }
  .fill { border-bottom: 1px solid #94a3b8; display: inline-block; min-width: 54px; height: 11px; vertical-align: baseline; }
  .notes {
    min-height: 62px;
    border: 1px solid #94a3b8;
    background: #fff;
    margin-top: 3px;
  }
  .panel-text { margin: 0 0 5px; color: #1e293b; }
  .init {
    background: #fef9c3;
    border: 1px solid #eab308;
    padding: 4px 6px;
    margin: 4px 0 8px;
    font-size: 9px;
    font-weight: 700;
  }
  .pay {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
  }
  .pay td {
    border: 1px solid #94a3b8;
    padding: 5px 7px;
    font-size: 9.5px;
  }
  .pay td:last-child { width: 42%; background: #f8fafc; }
  .cc-note { font-size: 8px; color: #64748b; margin: 5px 0 0; }
  .accept {
    margin-top: 10px;
    font-size: 9px;
    line-height: 1.4;
    color: #0f172a;
  }
  .sigs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 22px;
    margin-top: 8px;
  }
  .sig {
    border-top: 1.25px solid #0f172a;
    padding-top: 4px;
    margin-top: 26px;
    font-size: 9px;
    color: #334155;
  }
  .cancel {
    margin-top: 10px;
    padding-top: 7px;
    border-top: 1px solid #cbd5e1;
    font-size: 8.2px;
    font-weight: 700;
    line-height: 1.35;
    color: #0f172a;
  }
  .warn {
    margin-top: 6px;
    font-size: 8.2px;
    font-weight: 700;
    color: #9a3412;
    background: #fff7ed;
    border-left: 3px solid #ea580c;
    padding: 4px 6px;
  }
  .page2 { page-break-before: always; }
  .page2 .header { margin-bottom: 10px; }
  ol.terms {
    margin: 0;
    padding-left: 16px;
    columns: 2;
    column-gap: 20px;
    font-size: 8.8px;
  }
  ol.terms li { margin-bottom: 7px; break-inside: avoid; }
  ol.terms strong { font-size: 9px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <header class="header">
    <div class="logo-box">${logoHtml}</div>
    <div class="brand">
      <h1>${C.legalName}</h1>
      <p>Oak Brook Pointe, 700 Commerce Drive | Oak Brook, IL 60523</p>
      <p>${C.phoneDisplay}</p>
      <p>${C.website}</p>
    </div>
  </header>

  <div class="grid">
    <div class="field"><label>Property Owner</label><div class="box"></div></div>
    <div class="field"><label>Primary Phone <span class="req">*</span></label><div class="box"></div></div>
    <div class="field"><label>Secondary Phone <span class="req">*</span></label><div class="box"></div></div>
    <div class="field"><label>Property Address</label><div class="box"></div></div>
    <div class="field"><label>Primary Email</label><div class="box"></div></div>
    <div class="field"><label>Date of Loss</label><div class="box"></div></div>
    <div class="field"><label>City, State, Zip</label><div class="box"></div></div>
    <div class="field"><label>Insurance Company</label><div class="box"></div></div>
    <div class="field"><label>Claim No. (if known)</label><div class="box"></div></div>
  </div>

  <div class="cols">
    <section>
      <div class="section">ROOFING DETAILS</div>
      <p class="row-inline muted">Tear off <span class="fill"></span> layers &nbsp;&nbsp; Put On <span class="fill"></span> SQ</p>
      <div class="check"><i></i>Replace rotted decking as needed</div>
      <div class="check"><i></i>Install ice &amp; water shield</div>
      <div class="check"><i></i>Valley metal</div>
      <div class="check"><i></i>Underlayment</div>
      <div class="check"><i></i>Starter strip</div>
      <div class="check"><i></i>Hip / ridge shingles</div>

      <div class="subhead">Flashings</div>
      <div class="check"><i></i>Pipe flashings &nbsp;&nbsp; <i></i>Heater vent caps</div>
      <div class="check"><i></i>Step flashing &nbsp;&nbsp; <i></i>Apron flashing</div>
      <div class="check"><i></i>Chimney counter flashing &nbsp;&nbsp; <i></i>Drip edge</div>

      <div class="subhead">Ventilation / Misc</div>
      <div class="check"><i></i>Ridgevent &nbsp;&nbsp; <i></i>Power vent &nbsp;&nbsp; <i></i>Turbine</div>
      <div class="check"><i></i>Debris removal &nbsp;&nbsp; <i></i>Yard sweeping</div>
      <div class="check"><i></i>Quality control inspection</div>

      <p class="row-inline muted" style="margin-top:7px">
        Brand <span class="fill" style="min-width:70px"></span>
        Style <span class="fill" style="min-width:70px"></span>
        Color <span class="fill" style="min-width:70px"></span>
      </p>

      <div class="subhead">Warranty</div>
      <div class="check"><i></i>2.5-year workmanship (included)</div>
      <div class="check"><i></i>15-year workmanship (optional)</div>

      <div class="subhead">Other trades</div>
      <div class="check"><i></i>Gutters &nbsp;&nbsp; <i></i>Siding &nbsp;&nbsp; <i></i>Fascia &nbsp;&nbsp; <i></i>Soffit</div>

      <div class="subhead">Notes</div>
      <div class="notes"></div>
    </section>

    <section>
      <div class="section">PROJECT DETAILS</div>
      <p class="panel-text">Additional wood replacement for unforeseen rot is charged at Contractor’s normal rates and requires owner approval.</p>
      <div class="init">Owner Initials ________</div>
      <p class="panel-text">Contractor is not responsible for hidden structural conditions discovered after work begins.</p>
      <div class="init">Owner Initials ________</div>
      <p class="panel-text">Customer shall remit insurer-approved RCV amounts, including supplements, to Contractor. Contractor cannot act as a public adjuster.</p>
      <div class="init">Owner Initials ________</div>

      <div class="subhead">Contract and payment details</div>
      <table class="pay">
        <tr><td>$ Roof Total</td><td></td></tr>
        <tr><td>$ Roof Upgrade(s)</td><td></td></tr>
        <tr><td>$ Addendum</td><td></td></tr>
        <tr><td><strong>$ Total</strong></td><td></td></tr>
        <tr><td>$ Deposit</td><td></td></tr>
        <tr><td><strong>$ Balance Due</strong></td><td></td></tr>
      </table>
      <p class="cc-note">A service charge will be added to credit card transactions.</p>
    </section>
  </div>

  <p class="accept">
    <strong>Acceptance of Proposal</strong> — The above terms and conditions and those contained on the reverse side are satisfactory and are hereby accepted.
    ${C.legalName} is authorized to complete the work per this agreement and the customer agrees to the above payment terms.
  </p>
  <div class="sigs">
    <div class="sig">Owner Signature &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date</div>
    <div class="sig">Rep Signature &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date</div>
  </div>
  <p class="cancel">
    In accordance with Illinois law (815 ILCS 513), you may cancel within three (3) business days after signing
    (fifteen (15) business days if you are age 65 or older and the contract was solicited at your home by an uninvited contractor).
    Deliver or postmark written notice to ${C.legalName}, Oak Brook Pointe, 700 Commerce Drive, Oak Brook, IL 60523. Phone ${C.phoneDisplay}.
  </p>
  <p class="warn">
    ILLINOIS LAW (815 ILCS 513/18 &amp; 513/30): It is illegal for a contractor to pay, waive, rebate, or promise to pay any portion of your insurance deductible as an inducement to sale. You are solely responsible for paying your deductible.
  </p>

  <div class="page2">
    <header class="header">
      <div class="logo-box">${logoHtml}</div>
      <div class="brand">
        <h1>Terms and Conditions</h1>
        <p>${C.legalName} · Oak Brook Pointe, 700 Commerce Drive, Oak Brook, IL 60523 · ${C.phoneDisplay}</p>
      </div>
    </header>
    <ol class="terms">
      <li><strong>Changes.</strong> All changes require a written Change Order signed by both parties and may result in additional charges.</li>
      <li><strong>Performance.</strong> Work begins within 180 days after insurer approval of scope and price, or as soon as practicable, subject to weather and supply delays beyond Contractor’s control.</li>
      <li><strong>Warranty.</strong> Except statutory warranties that may apply, Contractor disclaims all other warranties, express or implied. Customer must give written notice within six months of discovery; Contractor has the right to cure within 30 days before legal action.</li>
      <li><strong>Insurance proceeds.</strong> Customer shall pay Contractor all insurance proceeds for the Work and cooperate on supplements. Contractor is not a public adjuster and does not negotiate claims on Customer’s behalf.</li>
      <li><strong>Access &amp; conditions.</strong> Customer provides clear access and utilities, and assumes responsibility for pre-existing or concealed conditions and normal construction vibration/debris risk.</li>
      <li><strong>Hazardous materials.</strong> Customer is responsible for asbestos, mold, lead, and similar conditions at the property.</li>
      <li><strong>Insurance.</strong> Contractor maintains general liability and workers’ compensation as required by Illinois law (815 ILCS 513/25).</li>
      <li><strong>Cancellation.</strong> If Customer cancels without a legal right to do so, Contractor is entitled to payment for work performed, restocking/non-returnable materials, plus 10% of the insurer-offered repair price as liquidated damages.</li>
      <li><strong>Payment.</strong> Final payment is due upon substantial completion and is a condition of warranty. Past-due amounts may accrue interest at the lesser of 8% per annum or the maximum allowed by Illinois law. Customer pays collection costs and reasonable attorneys’ fees if Contractor prevails.</li>
      <li><strong>Governing law.</strong> Illinois law governs. Venue lies in DuPage County, Illinois.</li>
      <li><strong>Entire agreement.</strong> This writing is the entire agreement between the parties. If any provision is unenforceable, the remainder remains in effect.</li>
      <li><strong>Advertising.</strong> Customer authorizes a yard sign and photos/video of the Work for promotional use.</li>
    </ol>
  </div>
</body>
</html>`;
}
