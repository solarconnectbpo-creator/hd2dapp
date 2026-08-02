import { COX_IL_COMPANY } from "./coxIlCompany";

/** Dark-blue header form front matching Cox IL field layout (no license line, 877 phone). */
export function buildCoxIlFormFrontHtml(): string {
  const C = COX_IL_COMPANY;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${C.legalName} — Illinois Contract</title>
<style>
  @page { size: letter; margin: 0.4in 0.45in; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 10px; }
  .header {
    display: flex; align-items: stretch; gap: 12px;
    background: #0b2a4a; color: #fff; padding: 10px 12px; border-radius: 2px;
  }
  .logo-box {
    background: #fff; color: #0b2a4a; padding: 6px 10px; min-width: 118px;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    border-radius: 2px;
  }
  .logo-mark { font-size: 11px; letter-spacing: 0.02em; }
  .logo-mark .cox { color: #1d4ed8; font-weight: 800; font-style: italic; }
  .logo-mark .roof { color: #dc2626; font-weight: 800; font-style: italic; }
  .logo-houses { font-size: 18px; line-height: 1; margin-bottom: 2px; }
  .brand { flex: 1; padding-top: 2px; }
  .brand h1 { margin: 0 0 4px; font-size: 18px; font-weight: 800; }
  .brand p { margin: 0 0 2px; font-size: 11px; line-height: 1.35; }
  .grid3 { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 8px; margin-top: 10px; }
  .grid2 { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 8px; margin-top: 8px; }
  .field label {
    display: block; font-size: 9px; color: #64748b; margin-bottom: 2px; font-weight: 600;
  }
  .field .box {
    border: 1px solid #94a3b8; background: #f8fafc; min-height: 22px; border-radius: 2px;
  }
  .req { color: #dc2626; }
  .section {
    margin-top: 12px; background: #0b2a4a; color: #fff; font-weight: 700;
    font-size: 11px; letter-spacing: 0.04em; padding: 5px 8px;
  }
  .cols { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 10px; margin-top: 8px; }
  .check { margin: 3px 0; }
  .check span {
    display: inline-block; width: 10px; height: 10px; border: 1px solid #334155;
    margin-right: 5px; vertical-align: -1px;
  }
  .line { border-bottom: 1px solid #94a3b8; min-height: 16px; margin: 4px 0; }
  .notes { min-height: 70px; border: 1px solid #94a3b8; background: #fff; }
  .pay td { border: 1px solid #cbd5e1; padding: 4px 6px; }
  .pay { width: 100%; border-collapse: collapse; margin-top: 6px; }
  .init { background: #fef9c3; border: 1px solid #eab308; padding: 3px 5px; margin: 4px 0; font-size: 9px; }
  .accept { margin-top: 10px; font-size: 9.5px; }
  .sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 14px; }
  .sig { border-top: 1px solid #0f172a; padding-top: 3px; margin-top: 22px; font-size: 9px; }
  .cancel {
    margin-top: 10px; font-size: 8.5px; font-weight: 700; line-height: 1.35;
  }
  .page2 { page-break-before: always; }
  ol.terms { columns: 2; column-gap: 18px; padding-left: 16px; font-size: 9px; }
  ol.terms li { margin-bottom: 6px; break-inside: avoid; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-box">
      <div class="logo-houses">⌂⌂⌂</div>
      <div class="logo-mark"><span class="cox">COX</span> <span class="roof">ROOFING</span></div>
    </div>
    <div class="brand">
      <h1>${C.legalName}</h1>
      <p>Oak Brook Pointe, 700 Commerce Drive | Oak Brook, IL 60523</p>
      <p>(877) 816-4245</p>
      <p>COXROOF.COM</p>
    </div>
  </div>

  <div class="grid3">
    <div class="field"><label>Property Owner</label><div class="box"></div></div>
    <div class="field"><label>Primary Phone <span class="req">*</span></label><div class="box"></div></div>
    <div class="field"><label>Secondary Phone <span class="req">*</span></label><div class="box"></div></div>
  </div>
  <div class="grid2">
    <div class="field"><label>Property Address</label><div class="box"></div></div>
    <div class="field"><label>Primary Email</label><div class="box"></div></div>
    <div class="field"><label>Date of Loss</label><div class="box"></div></div>
  </div>
  <div class="grid2">
    <div class="field"><label>City, State, Zip</label><div class="box"></div></div>
    <div class="field"><label>Insurance Company</label><div class="box"></div></div>
    <div class="field"><label>Claim No. (if known)</label><div class="box"></div></div>
  </div>

  <div class="cols">
    <div>
      <div class="section">ROOFING DETAILS</div>
      <p>Tear off ____ layers &nbsp;&nbsp; Put On ____ SQ</p>
      <div class="check"><span></span>Replace Rotted decking as needed</div>
      <div class="check"><span></span>Install Ice &amp; Water shield</div>
      <div class="check"><span></span>Valley metal</div>
      <div class="check"><span></span>Underlayment</div>
      <div class="check"><span></span>Starter strip</div>
      <div class="check"><span></span>Hip / ridge shingles</div>
      <p><strong>Flashings</strong></p>
      <div class="check"><span></span>Pipe flashings &nbsp; <span></span>Heater vent caps</div>
      <div class="check"><span></span>Step flashing &nbsp; <span></span>Apron flashing</div>
      <div class="check"><span></span>Chimney counter flashing &nbsp; <span></span>Drip edge</div>
      <p><strong>Ventilation / Misc</strong></p>
      <div class="check"><span></span>Ridgevent &nbsp; <span></span>Power Vent &nbsp; <span></span>Turbine</div>
      <div class="check"><span></span>Debris removal &nbsp; <span></span>Yard sweeping</div>
      <div class="check"><span></span>Quality control inspection</div>
      <p>Brand of roof ____________ Style ____________ Color ____________</p>
      <p><strong>Warranty</strong></p>
      <div class="check"><span></span>2.5-year workmanship (included)</div>
      <div class="check"><span></span>15-year workmanship (optional)</div>
      <p><strong>Other trades:</strong> <span></span> Gutters &nbsp; <span></span> Siding &nbsp; <span></span> Fascia &nbsp; <span></span> Soffit</p>
      <p><strong>NOTES</strong></p>
      <div class="notes"></div>
    </div>
    <div>
      <div class="section">PROJECT DETAILS</div>
      <p>Additional wood replacement for unforeseen rot is charged at Contractor’s normal rates and requires owner approval.</p>
      <div class="init">Owner Initials ________</div>
      <p>Contractor is not responsible for hidden structural conditions discovered after work begins.</p>
      <div class="init">Owner Initials ________</div>
      <p>Customer shall remit insurer-approved RCV amounts, including supplements, to Contractor. Contractor cannot act as a public adjuster.</p>
      <div class="init">Owner Initials ________</div>
      <p><strong>CONTRACT AND PAYMENT DETAILS</strong></p>
      <table class="pay">
        <tr><td>$ Roof Total</td><td style="width:40%"></td></tr>
        <tr><td>$ Roof Upgrade(s)</td><td></td></tr>
        <tr><td>$ Addendum</td><td></td></tr>
        <tr><td>$ Total</td><td></td></tr>
        <tr><td>$ Deposit</td><td></td></tr>
        <tr><td>$ Balance Due</td><td></td></tr>
      </table>
      <p style="font-size:8px;margin-top:6px">Service charge will be added to credit card transactions.</p>
    </div>
  </div>

  <p class="accept">
    <strong>Acceptance of Proposal</strong> — The above terms and conditions and those contained on the reverse side are satisfactory and are hereby accepted.
    ${C.legalName} is authorized to complete the work per this agreement and the customer agrees to the above payment terms.
  </p>
  <div class="sigs">
    <div><div class="sig">Owner Signature &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date</div></div>
    <div><div class="sig">Rep Signature &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date</div></div>
  </div>
  <p class="cancel">
    In accordance with Illinois law (815 ILCS 513), you may cancel within three (3) business days after signing
    (fifteen (15) business days if you are age 65 or older and the contract was solicited at your home by an uninvited contractor).
    Deliver or postmark written notice to ${C.legalName}, ${C.addressLine1}, ${C.cityStateZip}. Phone ${C.phoneDisplay}.
  </p>

  <div class="page2">
    <div class="header">
      <div class="logo-box">
        <div class="logo-mark"><span class="cox">COX</span> <span class="roof">ROOFING</span></div>
      </div>
      <div class="brand">
        <h1>Terms and Conditions</h1>
        <p>${C.legalName} · ${C.addressLine1}, ${C.cityStateZip} · ${C.phoneDisplay}</p>
      </div>
    </div>
    <ol class="terms">
      <li><strong>Changes.</strong> All changes require a written Change Order signed by both parties.</li>
      <li><strong>Performance.</strong> Work begins within 180 days after insurer approval of scope and price, or as soon as practicable, subject to weather and supply delays.</li>
      <li><strong>Warranty.</strong> Except statutory warranties, Contractor disclaims all other warranties, express or implied. Customer must give written notice within six months of discovery; Contractor has the right to cure within 30 days.</li>
      <li><strong>Insurance proceeds.</strong> Customer shall pay Contractor all insurance proceeds for the Work and cooperate on supplements. Contractor is not a public adjuster.</li>
      <li><strong>Access.</strong> Customer provides clear access, utilities, and assumes risk for pre-existing/concealed conditions and normal construction vibration.</li>
      <li><strong>Hazardous materials.</strong> Customer is responsible for asbestos, mold, lead, and similar conditions.</li>
      <li><strong>Insurance.</strong> Contractor maintains general liability and workers’ compensation as required by Illinois law (815 ILCS 513/25).</li>
      <li><strong>Cancellation damages.</strong> If Customer cancels without legal right, Contractor is entitled to work performed, restocking/non-returnable materials, plus 10% of insurer-offered repair price.</li>
      <li><strong>Payment.</strong> Final payment due upon substantial completion. Past-due amounts may accrue interest at the lesser of 8% per annum or the maximum allowed by Illinois law. Customer pays collection costs and reasonable attorneys’ fees if Contractor prevails.</li>
      <li><strong>Governing law.</strong> Illinois law; venue in DuPage County, Illinois.</li>
      <li><strong>Entire agreement.</strong> This writing is the entire agreement; unenforceable terms do not affect the remainder.</li>
      <li><strong>Advertising.</strong> Customer authorizes a yard sign and photos of the Work for promotional use.</li>
    </ol>
    <p style="margin-top:14px;font-size:9px">
      ILLINOIS LAW (815 ILCS 513/18 &amp; 513/30): It is illegal for a contractor to pay, waive, rebate, or promise to pay any portion of your insurance deductible as an inducement to sale.
    </p>
  </div>
</body>
</html>`;
}
