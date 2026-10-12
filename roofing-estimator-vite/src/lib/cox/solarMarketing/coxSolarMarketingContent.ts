import { COX_IL_COMPANY } from "../ilContract/coxIlCompany";

/** Cox Roofing Solar — Illinois homeowner marketing copy and closer talk tracks. */
export const COX_SOLAR_BRAND = {
  productName: "Cox Solar Solutions",
  legalName: COX_IL_COMPANY.legalName,
  shortName: COX_IL_COMPANY.shortName,
  motto: "Your Roof, Our Legacy",
  tagline: "Roof-ready solar for Illinois homes.",
  pitch:
    "You provide the roof and only pay for the power your system produces. We take care of everything else.",
  addressLine1: COX_IL_COMPANY.addressLine1,
  cityStateZip: COX_IL_COMPANY.cityStateZip,
  phoneDisplay: "(773) 308-6115",
  phoneE164: "+17733086115",
  phoneHref: "tel:+17733086115",
  websiteDisplay: "coxsolarsolutions.com",
  websiteHref: "https://www.coxsolarsolutions.com",
  email: "seth@coxroof.com",
} as const;

export type IncentiveKind = "rebate" | "net_metering" | "tax" | "permit";

export type SolarIncentive = {
  id: string;
  name: string;
  kind: IncentiveKind;
  kindLabel: string;
  summary: string;
  audience: string;
};

export type GuideSection = {
  title: string;
  body: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type TalkTrack = {
  id: string;
  title: string;
  body: string;
};

export type AdCopyPreset = {
  id: string;
  headline: string;
  body: string;
  cta: string;
};

export const COX_SOLAR_WHY: readonly GuideSection[] = [
  {
    title: "Lower the electric bill",
    body: "A rooftop system makes power where you use it. Surplus energy can go back to the utility so you earn bill credits instead of buying every kilowatt-hour at retail.",
  },
  {
    title: "Lock in more predictable energy costs",
    body: "Utility rates move. Solar that you host on your roof turns unused sun into a hedge against rising supply charges over the life of the system.",
  },
  {
    title: "Protect the roof and the investment together",
    body: "Cox starts with the roof. If shingles, flashing, or decking need work, we address that before panels go up so the array sits on a sound, warrantied surface.",
  },
  {
    title: "Stack Illinois programs while they last",
    body: "ComEd smart-inverter rebates, Solar for All for income-eligible homes, a 20-year property-tax hold-harmless, and Chicago permit fast-tracks can all change the numbers. We check what this address can actually claim.",
  },
];

export const COX_SOLAR_HOW_IT_WORKS: readonly GuideSection[] = [
  {
    title: "Solar panels",
    body: "Modules on the south- and west-facing planes collect sunlight and convert it into direct current (DC) electricity.",
  },
  {
    title: "Inverter",
    body: "A smart, grid-interactive inverter turns DC into household AC and talks to the utility so the system can qualify for Illinois distributed-generation rebates.",
  },
  {
    title: "Your home first",
    body: "Power flows to lights, HVAC, and appliances in real time. You use what you generate before you buy from the grid.",
  },
  {
    title: "Credits for surplus",
    body: "Extra production exports to the grid. Illinois credits that export — full retail-rate credits for legacy systems, or supply-only credits under Smart Solar Billing for new interconnects.",
  },
];

export const COX_SOLAR_PROCESS: readonly GuideSection[] = [
  {
    title: "1. Roof and bill review",
    body: "We measure the roof, check remaining life, and review 12 months of electric usage so the system is sized to the home — not a guess.",
  },
  {
    title: "2. Design and incentives",
    body: "You get a layout, production estimate, and a written list of programs this property may qualify for (utility rebate, Solar for All, Chicago permits, tax form).",
  },
  {
    title: "3. Permits and interconnection",
    body: "Cox files the building permit and the utility interconnection. Chicago jobs can use Solar Express or Green Permit when the project qualifies.",
  },
  {
    title: "4. Install, inspect, turn on",
    body: "Crews set racking and modules, the electrician lands the inverter, the city and utility inspect, and monitoring goes live after permission to operate.",
  },
];

export const COX_SOLAR_INCENTIVES: readonly SolarIncentive[] = [
  {
    id: "ilsfa",
    name: "Illinois Solar for All (ILSFA)",
    kind: "rebate",
    kindLabel: "Rebate",
    audience: "Income-eligible Illinois households",
    summary:
      "Income-eligible households (at or below 80% of area median income) can receive no-upfront-cost solar that is designed to deliver at least 50% savings on the value of energy produced. Availability and approved-vendor rules apply.",
  },
  {
    id: "comed-dg-solar",
    name: "ComEd Distributed Generation Smart Inverter Rebate — Solar",
    kind: "rebate",
    kindLabel: "Rebate",
    audience: "ComEd customers installing solar with a smart inverter",
    summary:
      "ComEd customers can receive a $300-per-kW upfront rebate for a solar system equipped with a qualifying smart inverter. Typical 7 kW home: about $2,100 before other programs.",
  },
  {
    id: "comed-dg-battery",
    name: "ComEd Distributed Generation Smart Inverter Rebate — Battery",
    kind: "rebate",
    kindLabel: "Rebate",
    audience: "ComEd customers adding storage",
    summary:
      "ComEd customers can receive a $300-per-kWh cash rebate for a battery with a smart inverter. Enrollment in a qualifying rate plan is required. Newer storage rebates generally include virtual-power-plant participation.",
  },
  {
    id: "vpp",
    name: "Virtual Power Plant (VPP) — Battery Storage Rebate",
    kind: "rebate",
    kindLabel: "Rebate",
    audience: "Residential battery customers",
    summary:
      "Under the CRGA-mandated Virtual Power Plant program (utility launch targeted by mid-2026), residential battery customers can earn the $300/kWh distributed-generation rebate by allowing the utility to dispatch the battery during high-demand events.",
  },
  {
    id: "nem-ssb",
    name: "Illinois Net Metering / Smart Solar Billing",
    kind: "net_metering",
    kindLabel: "Net metering",
    audience: "Illinois solar customers",
    summary:
      "Illinois still offers net metering. Legacy customers (systems installed before January 1, 2025) receive full retail-rate credits. New customers receive supply-only credits under Smart Solar Billing. We model both so the savings story matches the interconnect date.",
  },
  {
    id: "property-tax",
    name: "Illinois Solar Property Tax Exemption",
    kind: "tax",
    kindLabel: "Property tax exemption",
    audience: "Illinois homeowners",
    summary:
      "Illinois law excludes the added home value from a solar installation from property-tax assessments for 20 years (typically claimed with Form PTAX-330), so going solar should not raise the assessed value of the array itself.",
  },
  {
    id: "chi-express",
    name: "City of Chicago Solar Express Permit Program",
    kind: "permit",
    kindLabel: "Permit savings",
    audience: "Chicago homeowners",
    summary:
      "Chicago homeowners installing solar can use an expedited permitting path with a flat $100 savings on permit fees through Solar Express when the project qualifies.",
  },
  {
    id: "chi-green",
    name: "City of Chicago Green Permit Program",
    kind: "permit",
    kindLabel: "Permit savings",
    audience: "Chicago homeowners",
    summary:
      "Qualifying Chicago solar installations can receive priority permit review and reduced permit fees through the City of Chicago Green Permit Program.",
  },
];

export const COX_SOLAR_FAQ: readonly FaqItem[] = [
  {
    question: "Do I have to buy the system outright?",
    answer:
      "Not always. Many homeowners host the system on their roof and pay for the kilowatt-hours it produces. Cash, loan, and income-qualified Solar for All paths are reviewed against the same roof and bill so you can compare apples to apples.",
  },
  {
    question: "What if my roof is old?",
    answer:
      "We inspect first. If the roof has limited life left, Cox can replace or repair it before solar goes on. Panels should not be the thing that forces a reroof five years later.",
  },
  {
    question: "Did Illinois kill net metering?",
    answer:
      "No. Systems that interconnected before January 1, 2025 generally keep full retail-rate credits. New systems use Smart Solar Billing (supply-only export credits). Rebates and the property-tax exemption still matter on the new tariff — we run the numbers on your usage, not a national average.",
  },
  {
    question: "What about the federal tax credit?",
    answer:
      "The residential federal credit changed after 2025. Whether a cash purchase, loan, lease, or power-purchase agreement still captures any remaining federal value depends on the offer and the placed-in-service rules. We will tell you what applies to the option in front of you instead of promising a credit that may not be there.",
  },
  {
    question: "How much maintenance is there?",
    answer:
      "Rain does most of the washing. We recommend a visual check after major storms and keeping monitoring alerts on. Inverters and batteries have their own warranties; we walk those terms at proposal time.",
  },
  {
    question: "Will solar raise my property taxes?",
    answer:
      "Illinois excludes the added value of a qualifying solar energy system from assessment for 20 years when the exemption is filed. You still own a more valuable home — you should not be taxed as if the county added the array to the land value.",
  },
];

export const COX_SOLAR_TALK_TRACKS: readonly TalkTrack[] = [
  {
    id: "door-opener",
    title: "Door opener",
    body: "Hi — I’m with Cox Roofing Solar. We check the roof first, then see if this house can host solar so you only pay for the power it makes. Illinois still has a $300-per-kW ComEd rebate and a 20-year property-tax hold-harmless. Ninety seconds on the bill and the south face — if it doesn’t pencil, I’ll say so.",
  },
  {
    id: "roof-first",
    title: "Roof-first close",
    body: "Most solar companies start with panels. We start with the roof. If the shingles have five years left, we say so. If they don’t, Cox can reroof, then set the array on a warrantied deck. You are not buying a science project — you are buying a dry house that makes power.",
  },
  {
    id: "pay-for-power",
    title: "Pay-for-power pitch",
    body: "You provide the roof. You pay for the electricity the system produces. Cox handles design, permits, install, utility paperwork, and monitoring. If income qualifies, Solar for All can take the upfront cost off the table and is built to deliver at least half the value of the energy produced.",
  },
  {
    id: "nem-objection",
    title: "“Net metering is gone” objection",
    body: "Legacy systems still get full retail credits. New systems get supply-only credits under Smart Solar Billing — that is not zero. Stack the ComEd smart-inverter rebate, the battery rebate if storage fits, and the property-tax exemption, then compare to the last 12 months on the bill. I will not sell a story the tariff cannot support.",
  },
  {
    id: "chicago",
    title: "Chicago permit path",
    body: "Inside the city we can run Solar Express or Green Permit when the job qualifies — faster review and real fee savings, including $100 off on Solar Express. That is how we keep the install calendar honest instead of waiting on a standard residential queue.",
  },
];

export const COX_SOLAR_AD_COPY: readonly AdCopyPreset[] = [
  {
    id: "pay-for-power",
    headline: "You provide the roof. You pay for the power.",
    body: "Cox Roofing Solar designs, permits, and installs. Illinois homeowners can stack ComEd’s $300/kW smart-inverter rebate, a 20-year solar property-tax exemption, and income-qualified Solar for All. Start with a roof check.",
    cta: "Book a roof + solar review",
  },
  {
    id: "comed-rebate",
    headline: "ComEd homes: $300 per kW solar rebate",
    body: "Smart-inverter solar can unlock a $300/kW upfront utility rebate — about $2,100 on a typical 7 kW roof. Cox handles the roof, the array, and the paperwork. Oak Brook office. Call (773) 308-6115.",
    cta: "See if your address qualifies",
  },
  {
    id: "legacy-motto",
    headline: "Your roof. Our legacy. Your power.",
    body: "Cox Roofing has always been about the roof. Cox Roofing Solar adds production on top of a sound deck — net metering or Smart Solar Billing, Chicago permit fast-tracks, and a 20-year property-tax hold-harmless.",
    cta: "Get the Illinois solar guide",
  },
];

export const COX_SOLAR_DISCLAIMER =
  "Educational marketing only — not a quote, contract, tax opinion, or guarantee of savings. Incentive amounts, tariffs, income limits, interconnect rules, and permit fees change. Eligibility depends on utility territory, install date, system design, income, and program capacity. Confirm current ComEd, Ameren, Illinois Solar for All, Illinois Shines, and City of Chicago terms before you sign.";

export const COX_SOLAR_PUBLIC_PATH = "/cox-solar";
export const COX_SOLAR_LEAVEBEHIND_PATH = "/cox-solar/leavebehind";
export const COX_SOLAR_KIT_PATH = "/marketing/cox-solar";

export const COX_SOLAR_LEAVEBEHIND_BULLETS = [
  "Roof inspected or replaced before panels go on.",
  "You can pay for the power the system produces — we handle the rest.",
  "ComEd smart-inverter rebate: $300 per kW of solar.",
  "Battery rebate: $300 per kWh with a qualifying rate plan / VPP path.",
  "20-year Illinois property-tax exemption on added solar value.",
  "Chicago Solar Express and Green Permit fee / timeline savings.",
  "Income-eligible Solar for All: no upfront cost, at least 50% energy-value savings when you qualify.",
] as const;

export function coxSolarContactLine(): string {
  return `${COX_SOLAR_BRAND.productName} · A ${COX_SOLAR_BRAND.shortName} company · ${COX_SOLAR_BRAND.addressLine1}, ${COX_SOLAR_BRAND.cityStateZip} · ${COX_SOLAR_BRAND.phoneDisplay} · ${COX_SOLAR_BRAND.websiteDisplay}`;
}
