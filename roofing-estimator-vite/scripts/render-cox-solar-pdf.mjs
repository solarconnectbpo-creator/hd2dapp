/**
 * Render Cox Roofing Solar marketing PDFs with headless Chrome.
 * Usage: node scripts/render-cox-solar-pdf.mjs [extra-output-dir ...]
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logoSrc = `data:image/png;base64,${readFileSync(join(root, "public/cox-solar-solutions-logo.png")).toString("base64")}`;
const outDir = join(root, "docs/cox-solar");
mkdirSync(outDir, { recursive: true });

const extraDirs = process.argv.slice(2).filter(Boolean);
for (const dir of extraDirs) mkdirSync(dir, { recursive: true });

const chromeCandidates = [
  process.env.CHROME_PATH,
  "/opt/google/chrome/chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
].filter(Boolean);

const chrome = chromeCandidates.find((p) => spawnSync(p, ["--version"], { encoding: "utf8" }).status === 0);
if (!chrome) {
  console.error("Chrome/Chromium not found. Set CHROME_PATH.");
  process.exit(1);
}

const css = `
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
  .page { padding: 8px 4px 12px; }
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
  .leave { text-align: center; padding-top: 8px; }
  .leave h1 { font-size: 32px; }
  .leave .pitch { font-size: 20px; max-width: 34em; margin: 12px auto 18px; }
  @page { size: letter; margin: 0.55in; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    h2 { break-after: avoid; }
    .card, tr { break-inside: avoid; }
  }
`;

const nem = `<svg viewBox="0 0 640 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Solar production flowing to the home and extra power exporting to the utility grid">
  <circle cx="72" cy="56" r="28" fill="#e2a126"/>
  <g stroke="#e2a126" stroke-width="4" stroke-linecap="round">
    <line x1="72" y1="14" x2="72" y2="4"/><line x1="72" y1="108" x2="72" y2="118"/>
    <line x1="30" y1="56" x2="20" y2="56"/><line x1="114" y1="56" x2="124" y2="56"/>
    <line x1="42" y1="26" x2="34" y2="18"/><line x1="102" y1="26" x2="110" y2="18"/>
    <line x1="42" y1="86" x2="34" y2="94"/><line x1="102" y1="86" x2="110" y2="94"/>
  </g>
  <polygon points="160,118 250,58 340,118" fill="#c8102e"/>
  <rect x="178" y="118" width="144" height="78" fill="#c8102e"/>
  <rect x="232" y="148" width="36" height="48" fill="#f4f7fb"/>
  <rect x="194" y="132" width="28" height="22" fill="#f4f7fb"/>
  <rect x="278" y="132" width="28" height="22" fill="#f4f7fb"/>
  <line x1="348" y1="150" x2="470" y2="150" stroke="#5b6b7c" stroke-width="3" stroke-dasharray="8 7"/>
  <circle cx="410" cy="150" r="10" fill="none" stroke="#0f2744" stroke-width="3"/>
  <path d="M404 150 h6 l4-8 4 16 4-8 h6" fill="none" stroke="#0f2744" stroke-width="2"/>
  <line x1="520" y1="70" x2="520" y2="196" stroke="#0f2744" stroke-width="6"/>
  <line x1="490" y1="88" x2="550" y2="88" stroke="#0f2744" stroke-width="5"/>
  <line x1="498" y1="108" x2="542" y2="108" stroke="#0f2744" stroke-width="5"/>
  <line x1="506" y1="128" x2="534" y2="128" stroke="#0f2744" stroke-width="5"/>
  <text x="72" y="210" text-anchor="middle" font-size="13" fill="#5b6b7c" font-family="Georgia, serif">Sunlight</text>
  <text x="250" y="210" text-anchor="middle" font-size="13" fill="#5b6b7c" font-family="Georgia, serif">Your home</text>
  <text x="520" y="210" text-anchor="middle" font-size="13" fill="#5b6b7c" font-family="Georgia, serif">Utility grid</text>
</svg>`;

const brandBar = `<div class="brand-bar">
  <img src="${logoSrc}" alt="Cox Solar Solutions"/>
  <div style="text-align:right;font-family:Inter,system-ui,sans-serif;font-size:11px;color:#0f2744">
    <div class="eyebrow">Cox Solar Solutions</div>
    <div>(773) 308-6115</div>
    <div>coxsolarsolutions.com</div>
  </div>
</div>`;

const disclaimer =
  "Educational marketing only — not a quote, contract, tax opinion, or guarantee of savings. Incentive amounts, tariffs, income limits, interconnect rules, and permit fees change. Eligibility depends on utility territory, install date, system design, income, and program capacity. Confirm current ComEd, Ameren, Illinois Solar for All, Illinois Shines, and City of Chicago terms before you sign.";

const guideBody = `${brandBar}
  <p class="eyebrow">Illinois homeowner guide</p>
  <h1>Cox Solar Solutions</h1>
  <p class="pitch">You provide the roof and only pay for the power your system produces. We take care of everything else.</p>
  <p>Roof-ready solar for Illinois homes. Your Roof, Our Legacy.</p>

  <h2>What we do</h2>
  <p>Cox inspects or replaces the roof, then designs a solar system for that deck. Design, permits, installation, utility interconnection, and monitoring stay with us. You keep a dry home and a production number you can see on your bill.</p>

  <h2>Why homeowners go solar</h2>
  <div class="grid">
    <div class="card"><h3>Lower the electric bill</h3><p>A rooftop system makes power where you use it. Surplus energy can go back to the utility so you earn bill credits instead of buying every kilowatt-hour at retail.</p></div>
    <div class="card"><h3>Lock in more predictable energy costs</h3><p>Utility rates move. Solar that you host on your roof turns unused sun into a hedge against rising supply charges over the life of the system.</p></div>
    <div class="card"><h3>Protect the roof and the investment together</h3><p>Cox starts with the roof. If shingles, flashing, or decking need work, we address that before panels go up so the array sits on a sound, warrantied surface.</p></div>
    <div class="card"><h3>Stack Illinois programs while they last</h3><p>ComEd smart-inverter rebates, Solar for All for income-eligible homes, a 20-year property-tax hold-harmless, and Chicago permit fast-tracks can all change the numbers. We check what this address can actually claim.</p></div>
  </div>

  <h2>How solar works</h2>
  <div class="grid">
    <div class="card"><h3>Solar panels</h3><p>Modules on the south- and west-facing planes collect sunlight and convert it into direct current (DC) electricity.</p></div>
    <div class="card"><h3>Inverter</h3><p>A smart, grid-interactive inverter turns DC into household AC and talks to the utility so the system can qualify for Illinois distributed-generation rebates.</p></div>
    <div class="card"><h3>Your home first</h3><p>Power flows to lights, HVAC, and appliances in real time. You use what you generate before you buy from the grid.</p></div>
    <div class="card"><h3>Credits for surplus</h3><p>Extra production exports to the grid. Illinois credits that export — full retail-rate credits for legacy systems, or supply-only credits under Smart Solar Billing for new interconnects.</p></div>
  </div>

  <h2>Net energy metering</h2>
  <p>Production you do not use is sent to the grid. The utility credits surplus energy on a 12-month cycle. Legacy Illinois systems (installed before January 1, 2025) generally receive full retail-rate credits. New systems receive supply-only credits under Smart Solar Billing.</p>
  <div class="diagram">${nem}</div>

  <h2>Illinois &amp; Chicago programs</h2>
  <table>
    <thead><tr><th>Program</th><th>What it can mean for this house</th></tr></thead>
    <tbody>
      <tr><td><strong>Illinois Solar for All (ILSFA)</strong><div class="kind">Rebate</div></td><td>Income-eligible households (at or below 80% of area median income) can receive no-upfront-cost solar that is designed to deliver at least 50% savings on the value of energy produced. Availability and approved-vendor rules apply.</td></tr>
      <tr><td><strong>ComEd Distributed Generation Smart Inverter Rebate — Solar</strong><div class="kind">Rebate</div></td><td>ComEd customers can receive a $300-per-kW upfront rebate for a solar system equipped with a qualifying smart inverter. Typical 7 kW home: about $2,100 before other programs.</td></tr>
      <tr><td><strong>ComEd Distributed Generation Smart Inverter Rebate — Battery</strong><div class="kind">Rebate</div></td><td>ComEd customers can receive a $300-per-kWh cash rebate for a battery with a smart inverter. Enrollment in a qualifying rate plan is required. Newer storage rebates generally include virtual-power-plant participation.</td></tr>
      <tr><td><strong>Virtual Power Plant (VPP) — Battery Storage Rebate</strong><div class="kind">Rebate</div></td><td>Under the CRGA-mandated Virtual Power Plant program (utility launch targeted by mid-2026), residential battery customers can earn the $300/kWh distributed-generation rebate by allowing the utility to dispatch the battery during high-demand events.</td></tr>
      <tr><td><strong>Illinois Net Metering / Smart Solar Billing</strong><div class="kind">Net metering</div></td><td>Illinois still offers net metering. Legacy customers (systems installed before January 1, 2025) receive full retail-rate credits. New customers receive supply-only credits under Smart Solar Billing.</td></tr>
      <tr><td><strong>Illinois Solar Property Tax Exemption</strong><div class="kind">Property tax exemption</div></td><td>Illinois law excludes the added home value from a solar installation from property-tax assessments for 20 years (typically claimed with Form PTAX-330).</td></tr>
      <tr><td><strong>City of Chicago Solar Express Permit Program</strong><div class="kind">Permit savings</div></td><td>Chicago homeowners installing solar can use an expedited permitting path with a flat $100 savings on permit fees through Solar Express when the project qualifies.</td></tr>
      <tr><td><strong>City of Chicago Green Permit Program</strong><div class="kind">Permit savings</div></td><td>Qualifying Chicago solar installations can receive priority permit review and reduced permit fees through the City of Chicago Green Permit Program.</td></tr>
    </tbody>
  </table>

  <h2>How a Cox install moves</h2>
  <div class="grid">
    <div class="card"><h3>1. Roof and bill review</h3><p>We measure the roof, check remaining life, and review 12 months of electric usage so the system is sized to the home — not a guess.</p></div>
    <div class="card"><h3>2. Design and incentives</h3><p>You get a layout, production estimate, and a written list of programs this property may qualify for (utility rebate, Solar for All, Chicago permits, tax form).</p></div>
    <div class="card"><h3>3. Permits and interconnection</h3><p>Cox files the building permit and the utility interconnection. Chicago jobs can use Solar Express or Green Permit when the project qualifies.</p></div>
    <div class="card"><h3>4. Install, inspect, turn on</h3><p>Crews set racking and modules, the electrician lands the inverter, the city and utility inspect, and monitoring goes live after permission to operate.</p></div>
  </div>

  <h2>Questions we hear on the porch</h2>
  <div class="grid">
    <div class="card"><h3>Do I have to buy the system outright?</h3><p>Not always. Many homeowners host the system on their roof and pay for the kilowatt-hours it produces. Cash, loan, and income-qualified Solar for All paths are reviewed against the same roof and bill.</p></div>
    <div class="card"><h3>What if my roof is old?</h3><p>We inspect first. If the roof has limited life left, Cox can replace or repair it before solar goes on.</p></div>
    <div class="card"><h3>Did Illinois kill net metering?</h3><p>No. Systems that interconnected before January 1, 2025 generally keep full retail-rate credits. New systems use Smart Solar Billing (supply-only export credits).</p></div>
    <div class="card"><h3>What about the federal tax credit?</h3><p>The residential federal credit changed after 2025. Whether a cash purchase, loan, lease, or power-purchase agreement still captures any remaining federal value depends on the offer.</p></div>
    <div class="card"><h3>How much maintenance is there?</h3><p>Rain does most of the washing. We recommend a visual check after major storms and keeping monitoring alerts on.</p></div>
    <div class="card"><h3>Will solar raise my property taxes?</h3><p>Illinois excludes the added value of a qualifying solar energy system from assessment for 20 years when the exemption is filed.</p></div>
  </div>

  <div class="cta">
    <strong>Ready for a roof-first solar review?</strong>
    <p style="margin:6px 0 0">Call (773) 308-6115 · seth@coxroof.com · 700 Commerce Dr, Suite 500, Oak Brook, IL 60523</p>
  </div>
  <div class="footer">
    <p>Cox Solar Solutions · A Cox Roofing company · 700 Commerce Dr, Suite 500, Oak Brook, IL 60523 · (773) 308-6115 · coxsolarsolutions.com</p>
    <p class="disclaimer">${disclaimer}</p>
  </div>`;

const leaveBody = `${brandBar}
  <div class="leave">
    <p class="eyebrow">Your Roof, Our Legacy</p>
    <h1>Cox Solar Solutions</h1>
    <p class="pitch">You provide the roof and only pay for the power your system produces. We take care of everything else.</p>
    <div class="diagram" style="max-width:560px;margin:0 auto 16px">${nem}</div>
    <ul style="text-align:left;max-width:34em;margin:0 auto 18px;padding-left:1.2em">
      <li>Roof inspected or replaced before panels go on.</li>
      <li>You can pay for the power the system produces — we handle the rest.</li>
      <li>ComEd smart-inverter rebate: $300 per kW of solar.</li>
      <li>Battery rebate: $300 per kWh with a qualifying rate plan / VPP path.</li>
      <li>20-year Illinois property-tax exemption on added solar value.</li>
      <li>Chicago Solar Express and Green Permit fee / timeline savings.</li>
      <li>Income-eligible Solar for All: no upfront cost, at least 50% energy-value savings when you qualify.</li>
    </ul>
    <div class="cta">
      <strong>Call (773) 308-6115</strong>
      <p style="margin:6px 0 0">700 Commerce Dr, Suite 500, Oak Brook, IL 60523 · coxsolarsolutions.com</p>
    </div>
    <p class="disclaimer">${disclaimer}</p>
  </div>`;

function wrap(title, body) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>${title}</title><style>${css}</style></head><body><article class="page">${body}</article></body></html>`;
}

function printPdf(filename, title, body) {
  const htmlPath = join(outDir, `${filename}.html`);
  const pdfPath = join(outDir, `${filename}.pdf`);
  const profile = mkdtempSync(join(tmpdir(), "cox-solar-chrome-"));
  writeFileSync(htmlPath, wrap(title, body), "utf8");
  const result = spawnSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${profile}`,
      "--no-pdf-header-footer",
      `--print-to-pdf=${pdfPath}`,
      "--virtual-time-budget=2000",
      "--run-all-compositor-stages-before-draw",
      pathToFileURL(htmlPath).href,
    ],
    { encoding: "utf8", timeout: 45000 },
  );
  rmSync(profile, { recursive: true, force: true });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    throw new Error(`Chrome failed for ${filename}`);
  }
  for (const dir of extraDirs) {
    writeFileSync(join(dir, `${filename}.pdf`), readFileSync(pdfPath));
  }
  console.log(`Wrote ${pdfPath}`);
}

printPdf("Cox-Roofing-Solar-Illinois-Guide", "Cox Solar Solutions — Illinois homeowner guide", guideBody);
printPdf("Cox-Roofing-Solar-Leavebehind", "Cox Solar Solutions — Illinois leave-behind", leaveBody);
