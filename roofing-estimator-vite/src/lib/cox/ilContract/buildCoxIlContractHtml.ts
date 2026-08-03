import { COX_IL_COMPANY, coxIlAddressBlock, coxIlFooterLine } from "./coxIlCompany";
import { coxIlLetterheadHtml, coxIlLetterheadStyles } from "./coxIlLetterhead";
import type { CoxIlContractFields } from "./coxIlContractTypes";

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

const C = COX_IL_COMPANY;

function sharedStyles(): string {
  return `
    @page { size: letter; margin: 0.42in 0.48in; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #0f172a;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      font-size: 10.5px;
      line-height: 1.45;
      background: #fff;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 18px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #0c4a6e;
    }
    h2 {
      margin: 14px 0 6px;
      font-size: 12px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #0c4a6e;
      border-bottom: 1.5px solid #0c4a6e;
      padding-bottom: 3px;
    }
    h3 {
      margin: 10px 0 4px;
      font-size: 11px;
      color: #0f172a;
    }
    p { margin: 0 0 7px; }
    ${coxIlLetterheadStyles()}
    .letterhead { margin-bottom: 10px; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .fine { font-size: 9.5px; color: #334155; }
    .callout {
      background: #f0f9ff;
      border: 1px solid #7dd3fc;
      border-left: 4px solid #0284c7;
      padding: 7px 9px;
      margin: 8px 0;
    }
    .warn {
      background: #fff7ed;
      border: 1px solid #fdba74;
      border-left: 4px solid #ea580c;
      padding: 7px 9px;
      margin: 8px 0;
      font-weight: 600;
    }
    .grid2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 14px;
      margin: 8px 0;
    }
    .field .lab {
      display: block;
      font-size: 8.5px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .field .val {
      display: block;
      min-height: 16px;
      border-bottom: 1px solid #94a3b8;
      padding: 2px 0 3px;
      font-size: 11px;
      font-weight: 600;
    }
    .sig-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-top: 16px;
    }
    .sig-box {
      border-top: 1px solid #0f172a;
      padding-top: 4px;
      margin-top: 28px;
      font-size: 9.5px;
    }
    .check {
      margin: 8px 0;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
    }
    .checkbox {
      display: inline-block;
      width: 11px;
      height: 11px;
      border: 1.5px solid #0f172a;
      margin-right: 6px;
      vertical-align: -2px;
    }
    ol.terms {
      margin: 0;
      padding-left: 18px;
      columns: 2;
      column-gap: 22px;
    }
    ol.terms li {
      break-inside: avoid;
      margin-bottom: 7px;
      font-size: 9.2px;
    }
    ol.terms li strong { font-size: 9.5px; }
    .rights-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 8px 0 12px;
    }
    .right-card {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 7px 8px;
      background: #f8fafc;
      font-size: 9.2px;
    }
    .right-card strong { display: block; margin-bottom: 2px; color: #0c4a6e; }
    .footer-line {
      margin-top: 14px;
      padding-top: 6px;
      border-top: 1px solid #cbd5e1;
      font-size: 8.5px;
      color: #64748b;
    }
    .copy-tag {
      float: right;
      font-size: 8.5px;
      font-weight: 700;
      color: #0369a1;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    ul.compact { margin: 4px 0 8px; padding-left: 16px; }
    ul.compact li { margin-bottom: 2px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;
}

function brandHeader(subtitle: string, logoDataUrl?: string): string {
  return coxIlLetterheadHtml({ logoDataUrl, subtitle });
}

function cancellationNotice(copyLabel: string, fields: CoxIlContractFields, logoDataUrl?: string): string {
  return `
  <section class="page">
    ${brandHeader("Illinois Home Repair & Remodeling — Notice of Cancellation", logoDataUrl)}
    <span class="copy-tag">${esc(copyLabel)}</span>
    <h1>Notice of Cancellation</h1>
    <p class="fine">NOTICE OF CANCELLATION OF HOME REPAIR AND REMODELING CONTRACT ENTERED BY AND BETWEEN THE UNDERSIGNED AND ${esc(C.legalName)}</p>
    <p><strong>CONTRACT DATED:</strong> ${blank(fields.contractDate)}</p>
    <p>If you do not want the goods or services described in the above contract, you may cancel your purchase by mailing or delivering a signed and dated copy of this cancellation notice or any other written notice to ${esc(C.legalName)} (the "Contractor") at ${esc(coxIlAddressBlock())} — not later than midnight of the third (3rd) business day after the date the contract was entered into between you and Contractor.</p>
    <div class="callout">
      <strong>Senior Citizen Exception (815 ILCS 513/22):</strong>
      If you are 65 years of age or older and this contract was solicited at your home by an uninvited contractor, you have until midnight of the fifteenth (15th) full business day to cancel. Sundays and federal holidays do not count as business days.
    </div>
    <p>If you cancel, any payments made by you under the contract or sale, any property traded in, and any instrument executed by you will be returned within ten (10) business days following receipt by Contractor of your cancellation notice, and any security interest arising out of the transaction will be canceled.</p>
    <p>If you cancel, you must make available to Contractor at your residence, in substantially as good condition as when received, any goods delivered to you under this contract; or you may comply with Contractor's written instructions regarding return shipment at Contractor's expense and risk. If Contractor does not pick up goods within 20 days of your notice, you may retain or dispose of them without further obligation.</p>
    <p class="fine"><strong>${esc(C.shortName)}</strong><br/>${esc(coxIlAddressBlock())}<br/>Phone: ${esc(C.phoneDisplay)}</p>
    <h3>I HEREBY CANCEL THIS TRANSACTION.</h3>
    <div class="grid2">
      ${fieldCell("Date", "")}
      ${fieldCell("Customer's Signature", "")}
      ${fieldCell("Print Name", fields.customerName)}
      ${fieldCell("Address", fields.lossAddress)}
      ${fieldCell("City, State, Zip", fields.cityStateZip)}
      ${fieldCell("Phone", fields.primaryPhone)}
    </div>
    <div class="footer-line">${esc(coxIlFooterLine())}</div>
  </section>`;
}

function insuranceDenialNotice(copyLabel: string, fields: CoxIlContractFields, logoDataUrl?: string): string {
  return `
  <section class="page">
    ${brandHeader("Illinois — Notice of Cancellation Due to Insurance Claim Denial", logoDataUrl)}
    <span class="copy-tag">${esc(copyLabel)}</span>
    <h1>Notice of Cancellation Due to Insurance Claim Denial</h1>
    <p>If your insurer notifies you that all or any part of your claim or contract is not a covered loss under your insurance policy, you may cancel this contract by mailing or delivering a signed and dated copy of this cancellation notice or any other written notice to ${esc(C.legalName)} (the "Contractor") at ${esc(coxIlAddressBlock())} — at any time prior to midnight on the earlier of:</p>
    <ul class="compact">
      <li>(a) The fifth (5th) business day after you have received written notice from your insurer that all or any part of the claim is not a covered loss; or</li>
      <li>(b) The thirtieth (30th) business day after your insurer has received your properly executed proof(s) of loss. <em>(815 ILCS 513)</em></li>
    </ul>
    <p>If you cancel, any payments made by you under the contract will be returned to you within ten (10) business days following receipt by Contractor of your cancellation notice.</p>
    <div class="callout">
      <strong>Exception for Emergency / Catastrophe Work:</strong>
      If you previously acknowledged and agreed in writing that certain goods or services were necessary to prevent damage to your property due to a catastrophe, Contractor is entitled to the reasonable value of those emergency goods or services even upon cancellation.
    </div>
    <p class="fine"><strong>${esc(C.shortName)}</strong><br/>${esc(coxIlAddressBlock())}<br/>Phone: ${esc(C.phoneDisplay)}</p>
    <h3>I HEREBY CANCEL THIS TRANSACTION.</h3>
    <div class="grid2">
      ${fieldCell("Date", "")}
      ${fieldCell("Customer's Signature", "")}
      ${fieldCell("Print Name", fields.customerName)}
      ${fieldCell("Address", fields.lossAddress)}
      ${fieldCell("City, State, Zip", fields.cityStateZip)}
      ${fieldCell("Claim No. (if known)", fields.claimNumber)}
    </div>
    <div class="footer-line">${esc(coxIlFooterLine())}</div>
  </section>`;
}

function mechanicsLienPage(logoDataUrl?: string): string {
  return `
  <section class="page">
    ${brandHeader("Illinois Mechanics Lien Notice", logoDataUrl)}
    <h1>Mechanic's Lien Notice</h1>
    <p>(a) Any person or company supplying labor or materials for this improvement to your property may file a lien against your property if that person or company is not paid for the contributions; and</p>
    <p>(b) Under Illinois law, you have the right to pay persons who supplied labor or materials for this improvement directly and deduct this amount from our contract price, or withhold the amounts due them from us until 90 days after completion of the improvement unless we give you a lien waiver signed by persons who supplied any labor or material for the improvement and who gave you timely notice.</p>
    <p class="fine" style="margin-top:16px">See also the Illinois Mechanics Lien Act (770 ILCS 60). Request lien waivers before final payment.</p>
    <div class="footer-line">${esc(coxIlFooterLine())}</div>
  </section>`;
}

function consumerRightsPage(fields: CoxIlContractFields, logoDataUrl?: string): string {
  return `
  <section class="page">
    ${brandHeader("Home Repair: Know Your Consumer Rights", logoDataUrl)}
    <h1>Home Repair: Know Your Consumer Rights</h1>
    <p class="fine"><strong>Illinois Home Repair and Remodeling Act · 815 ILCS 513</strong><br/>
    CONSUMER RIGHTS ACKNOWLEDGMENT FORM — Required by 815 ILCS 513/20 — In Duplicate — Contractor retains original / Customer retains duplicate</p>
    <p>Illinois law (815 ILCS 513/20) requires your contractor to provide this pamphlet before you sign any home repair or remodeling contract over $1,000. Please read this carefully, keep your copy, and ask questions before signing.</p>
    <div class="rights-grid">
      <div class="right-card"><strong>Get It in Writing</strong>You have the right to a written contract for all work over $1,000 that clearly describes the scope, materials, and total price. Never sign a blank or incomplete contract.</div>
      <div class="right-card"><strong>Right to Cancel</strong>If this contract was signed at your home, you have 3 business days to cancel for any reason. If you are 65 or older and the contractor came to you uninvited, you have 15 business days. Sundays and federal holidays do not count. Cancellation must be in writing.</div>
      <div class="right-card"><strong>Written Estimate</strong>You have the right to a written, itemized estimate of labor and materials before work begins. This is part of your signed contract.</div>
      <div class="right-card"><strong>Deductible Protection</strong>It is ILLEGAL for a contractor to pay, waive, or rebate your insurance deductible (815 ILCS 513/18 &amp; 513/30). Any offer to cover your deductible is a violation of Illinois law. Report violations: 1-800-243-0618.</div>
      <div class="right-card"><strong>Permits &amp; Inspections</strong>Your contractor must obtain all required permits. You have the right to confirm permits were obtained. Check with your local municipality.</div>
      <div class="right-card"><strong>Lien Protection</strong>Under the Illinois Mechanics Lien Act (770 ILCS 60), unpaid subcontractors or suppliers may lien your home even if you paid the contractor in full. Request lien waivers before final payment.</div>
      <div class="right-card"><strong>License &amp; Insurance</strong>Ask for proof of general liability insurance. Verify the contractor's business is properly registered in Illinois.</div>
      <div class="right-card"><strong>Warranties</strong>Get all warranty terms in writing. Illinois law entitles you to: 1-year warranty on workmanship/materials; 2-year on mechanical systems; 10-year on major structural work.</div>
      <div class="right-card"><strong>No Adjusting Without a License</strong>Your contractor CANNOT file or negotiate an insurance claim on your behalf — that requires a licensed Public Adjuster (815 ILCS 513 / Public Act 96-1332).</div>
      <div class="right-card"><strong>How to File a Complaint</strong>Contact the Illinois Attorney General's Consumer Protection Division: 1-800-243-0618, or visit www.illinoisattorneygeneral.gov</div>
    </div>
    <p><em>"I, the homeowner, have received from the contractor a copy of the pamphlet entitled 'Home Repair: Know Your Consumer Rights.'"</em></p>
    <div class="sig-row">
      <div>
        <div class="sig-box">Customer Signature · Date</div>
        <p class="fine" style="margin-top:6px">${blank(fields.customerName, "Print name")}</p>
      </div>
      <div>
        <div class="sig-box">Customer Signature (2nd if applicable) · Date</div>
      </div>
    </div>
    <div class="footer-line">${esc(coxIlFooterLine())}</div>
  </section>`;
}

function contractFront(fields: CoxIlContractFields, logoDataUrl?: string): string {
  return `
  <section class="page">
    ${brandHeader("Illinois Restoration Contract", logoDataUrl)}
    <h1>Restoration Contract</h1>
    <p>By signing this Restoration Contract (the "Contract" or "Agreement"), the customer identified below (the "Customer" or "You") authorizes <strong>${esc(C.legalName)}</strong> ("Contractor") to: (1) conduct an inspection and document damage to the Loss Address identified below; (2) discuss with the Customer's insurance company (the "Insurer") the scope of damage it identifies and the scope and price of the work needed to repair certain damages; and (3) perform repairs if and when Contractor approves Insurer's scope and price. The Insurer's proposed scope and price is subject to Contractor's approval, without exception. If you have not already received an estimate from your Insurer, attached you will find Contractor's good faith estimate of identified damages. Such amounts are estimates only, are not guaranteed, and are subject to change.</p>
    <p>Customer's signature below authorizes Contractor to complete approved repairs at the Replacement Cost Value described on the Insurer's loss statement (the "Work"), subject to the Terms and Conditions on the reverse side, with no additional cost to the Customer except for its insurance deductible, provided that the Customer shall also be responsible to pay the costs of: (1) any additional work requested but not included in the Insurer's loss statement; (2) necessary repairs to satisfy building code requirements, to the extent not reimbursable by your insurance policy; (3) any emergency repairs; and (4) any of the replacement cost value not recoverable under the applicable policy. By signing this Agreement, You confirm You know and/or have confirmed with Insurer the coverages available under your policy and acknowledge that Contractor has not and will not advise on any policy coverage matters.</p>
    <p>Customer further agrees that any supplemental work Contractor may later identify as necessary shall become part of this Agreement. Customer acknowledges that Contractor is a General Contractor and charges overhead and profit as part of the Work.</p>
    <p><strong>About Your Insurance Funds:</strong> When your insurance company releases payment for approved repairs, those funds are designated to pay for the work covered under this Agreement. Customer agrees to forward all insurance proceeds received for the Work to Contractor promptly upon receipt. If your insurer provides only a partial approval, Contractor will work with you and re-approach the insurer with photos, documentation, and scope support to pursue full approval — though Contractor cannot act as your public adjuster or negotiate your claim on your behalf (that requires a separately licensed public adjuster). Customer shall not redirect or spend any insurance proceeds related to the Work without Contractor's prior written consent.</p>
    <p class="fine">This Agreement consists of: (i) this contract and the Terms &amp; Conditions on the reverse side; (ii) the Insurer's loss statement(s); (iii) any written change orders; and (iv) the documents acknowledged below. This Agreement merges all agreements between the Parties, and any representations not in writing herein are not included.</p>

    <h2>Customer &amp; Loss Information</h2>
    <div class="grid2">
      ${fieldCell("Customer Name", fields.customerName)}
      ${fieldCell("Primary Phone", fields.primaryPhone)}
      ${fieldCell("Secondary Phone", fields.secondaryPhone)}
      ${fieldCell("Primary Email", fields.email)}
      ${fieldCell("Loss Address", fields.lossAddress)}
      ${fieldCell("City, State, Zip", fields.cityStateZip)}
      ${fieldCell("Date of Loss", fields.dateOfLoss)}
      ${fieldCell("Insurance Company", fields.insuranceCompany)}
      ${fieldCell("Claim No. (if known)", fields.claimNumber)}
      ${fieldCell("Contract Date", fields.contractDate)}
    </div>
    <div class="field" style="margin-top:6px">
      <span class="lab">Notes</span>
      <span class="val" style="min-height:28px">${blank(fields.notes, " ")}</span>
    </div>

    <h2>Acceptance of Agreement</h2>
    <p>By Customer's signature below, Customer acknowledges and agrees that it understands and accepts this Agreement; that Contractor has notified Customer both orally and in writing of its right to cancel; that Contractor will perform the Work subject to the terms of this Agreement; and that Customer will be responsible for payment of Customer's insurance deductible.</p>
    <div class="callout">
      <strong>RIGHT OF CANCELLATION:</strong>
      If this Agreement was procured through a home solicitation sale, you may cancel at any time prior to midnight of the third (3rd) business day after the date of this transaction (or the fifteenth (15th) business day if you are age 65 or older — 815 ILCS 513/22). See attached Notice of Cancellation forms.
    </div>
    <div class="warn">
      ILLINOIS LAW (815 ILCS 513/18 &amp; 513/30): It is illegal for a contractor to pay, waive, rebate, or promise to pay any portion of your insurance deductible as an inducement to sale. You are solely responsible for paying your deductible.
    </div>
    <div class="check">
      <span class="checkbox"></span>
      By checking this box I/we confirm receipt prior to signing of: (1) Notice of Cancellation (2 copies); (2) Notice of Cancellation Due to Insurance Claim Denial (2 copies); and (3) Illinois Deductible Rebating Prohibition Notice (815 ILCS 513/18 &amp; 513/30). Note: The "Home Repair: Know Your Consumer Rights" pamphlet is acknowledged separately by dual signature as required by 815 ILCS 513/20.
    </div>
    <div class="sig-row">
      <div>
        <div class="sig-box">Customer Signature · Date</div>
      </div>
      <div>
        <div class="sig-box">Customer Signature (2nd, if applicable) · Date</div>
      </div>
      <div>
        <div class="sig-box">Contractor Signature · Date</div>
        <p class="fine" style="margin-top:4px">${blank(fields.contractorRepName, esc(C.legalName))}</p>
      </div>
      <div>
        <p class="fine" style="margin-top:28px"><strong>${esc(C.legalName)}</strong><br/>${esc(coxIlAddressBlock())}<br/>${esc(C.phoneDisplay)} · ${esc(C.website)}</p>
      </div>
    </div>
    <div class="footer-line">${esc(coxIlFooterLine())}</div>
  </section>`;
}

function termsBack(logoDataUrl?: string): string {
  return `
  <section class="page">
    ${brandHeader("Terms and Conditions (Reverse Side)", logoDataUrl)}
    <h1>Terms &amp; Conditions</h1>
    <p class="fine">The following Terms and Conditions are incorporated into and made a part of the Restoration Contract with ${esc(C.legalName)} (the "Contractor").</p>
    <ol class="terms">
      <li><strong>Changes.</strong> All changes to the Work require a written Change Order signed by Contractor and Customer and may result in additional charges. Customer shall sign Change Orders for additional work required by engineers or inspectors. No changes to this Agreement are valid unless in writing and signed by both parties.</li>
      <li><strong>Performance.</strong> Contractor shall begin Work within 180 days after approval of price, scope, and replacement cost by the Insurer, or as soon as practicable. Work shall be substantially completed in a timely manner consistent with proper workmanship, subject to delays from weather, labor or material availability, or other conditions beyond Contractor's control.</li>
      <li><strong>Warranty and Workmanship.</strong> Other than those statutory warranties which may apply to the Work, CONTRACTOR HEREBY DISCLAIMS ALL OTHER WARRANTIES, EXPRESS OR IMPLIED. Contractor further disclaims claims for breach of contract, negligence, and other claims of any kind whatsoever for which Customer has not provided Contractor with written or actual notice within six months from the date of discovery of the problem. Customer agrees to allow Contractor or its agents to review the conditions of any claim, item, or matter in dispute prior to disturbing the conditions and before any repairs or alterations are made, or the right to make said claim is waived. Customer further agrees that Contractor shall have the right to cure any alleged defect in workmanship within 30 days, or longer if impractical, prior to initiating legal action.</li>
      <li><strong>Cooperation.</strong> Customer shall pay Contractor all insurance proceeds for the Work. Any additional or unforeseen work requires a signed Change Order, and Customer agrees to sign and is responsible for all related costs. Customer will cooperate with Contractor in submitting supplemental claims, if applicable. Contractor is entitled to all compensation approved and paid by the Insurer.</li>
      <li><strong>Customer's Obligations.</strong> Customer shall provide Contractor, at no cost, clear access to work areas, including removal of ice and snow, for workers, equipment, delivery, and material storage. Customer shall provide electricity, water, and utilities and identify underground utilities, if applicable. Customer agrees to indemnify and hold Contractor harmless from damage caused by equipment, materials, debris, or construction activity. Contractor is not responsible for securing gates or doors. Excess materials remain Contractor's property. Customer shall remove or protect personal property near work areas and assumes risk of damage from normal construction, including vibration. Customer shall not direct Contractor's workforce, supply labor or materials, or hire subcontractors. Customer assumes liability for damage caused by dumpsters, delivery vehicles, and construction equipment.</li>
      <li><strong>Existing Conditions.</strong> This Agreement is based on visible conditions at the time of inspection. Customer assumes responsibility for pre-existing or concealed conditions. Contractor may suspend Work until additional work is agreed upon if such conditions are discovered. Contractor is not responsible for existing code violations or deficiencies. Materials and finishes may vary in color, brand, grade, or dimensions. Contractor may make reasonable substitutions that do not materially affect quality or design. Contractor does not guarantee prevention of ice buildup or ice dams and is not liable for the same.</li>
      <li><strong>Hazardous Material.</strong> Customer assumes full responsibility for all hazardous conditions, including asbestos, mold, lead, or other harmful materials at the property. Such conditions are deemed pre-existing. Contractor may stop Work until conditions are removed. Customer agrees to indemnify and hold Contractor harmless from any claims or damages related to mold, fungus, or other biological materials.</li>
      <li><strong>Insurance.</strong> Contractor maintains general liability and workers' compensation insurance as required by Illinois law (815 ILCS 513/25).</li>
      <li><strong>Cancellation.</strong> Customer acknowledges Contractor shall undertake substantial effort identifying damage to Customer's property, preparing estimates, communicating with Insurer, supplying and scheduling materials and labor, coordinating tradespersons, attending inspections with building officials, and other activities, and that damages arising from Customer's breach or cancellation would be difficult to ascertain. If Customer cancels this Agreement without the legal right to do so, then Contractor shall be entitled to, as liquidated damages and not as a penalty, payment of any work performed at the Property, any restocking charges from returned material, the cost of material that cannot be returned, plus 10% of the price of repairs offered by Customer's Insurer.</li>
      <li><strong>Confidential Information.</strong> Customer agrees that Contractor's costs, expenses, and pricing, including labor, materials, invoices, and project costs, are confidential and shall not be disclosed to any third party.</li>
      <li><strong>Payment.</strong> Contractor will not start the Work until it receives the initial Actual Cash Value payment from the Insurer, plus any additional amounts Contractor may require. Final payment is due upon substantial completion of the Work. Final payment is a condition precedent to any applicable warranties. All invoices are payable within 30 days. Failure to make timely payment will result in charges added to the overdue amount at the lesser of 8% per annum or the maximum charge allowed by Illinois law. Customer agrees to pay all collection costs, including court, legal, and attorneys' fees incurred in the collection of past due amounts or in the event of litigation where Contractor is the prevailing party.</li>
      <li><strong>Governing Law and Venue.</strong> This Agreement shall be governed by and construed in accordance with the laws of the State of Illinois. Any legal action shall be brought in state or federal courts in ${esc(C.venueCounty)}, ${esc(C.venueState)}. Customer consents to jurisdiction and venue in such courts.</li>
      <li><strong>Miscellaneous.</strong> If any provision of this Agreement is found unenforceable, the availability and enforceability of all remaining provisions shall remain in full effect. The headings herein are for reference purposes only and shall not affect the meaning or interpretation of this Agreement. This Agreement constitutes the entire agreement between the parties and supersedes all prior representations, negotiations, or discussions, whether oral or written.</li>
      <li><strong>Advertising.</strong> Customer authorizes Contractor to place its advertising yard sign on Customer's property. Customer grants Contractor unlimited license to record images of the Work in any form and to reproduce those images for advertising and promotional use.</li>
    </ol>
    <div class="footer-line">${esc(coxIlFooterLine())}</div>
  </section>`;
}

/**
 * Full printable Cox IL packet:
 * 1) Restoration contract front
 * 2) Terms & conditions reverse
 * 3–4) Notice of Cancellation (2 copies)
 * 5–6) Insurance claim denial cancellation (2 copies)
 * 7) Mechanic's lien notice
 * 8) Consumer rights acknowledgment
 */
export function buildCoxIlContractHtml(fields: CoxIlContractFields, logoDataUrl?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(C.legalName)} — Illinois Restoration Contract</title>
  <style>${sharedStyles()}</style>
</head>
<body>
${contractFront(fields, logoDataUrl)}
${termsBack(logoDataUrl)}
${cancellationNotice("Copy 1 of 2 — Customer retains", fields, logoDataUrl)}
${cancellationNotice("Copy 2 of 2 — Customer retains", fields, logoDataUrl)}
${insuranceDenialNotice("Copy 1 of 2 — Customer retains", fields, logoDataUrl)}
${insuranceDenialNotice("Copy 2 of 2 — Customer retains", fields, logoDataUrl)}
${mechanicsLienPage(logoDataUrl)}
${consumerRightsPage(fields, logoDataUrl)}
</body>
</html>`;
}
