import type { DamageRoofReport, RoofDamageEstimate } from "./roofReportTypes";
import { getInspectionEmail, getInspectionPhone } from "./inspectionContact";

export type ScheduleInspectionBlock = {
  headline: string;
  body: string;
  phone?: string;
  email?: string;
  disclaimer: string;
  /** Optional AI line — must not invent pricing; kept separate for audit. */
  aiClientMessage?: string;
};

const DEFAULT_DISCLAIMER =
  "Ballpark range only — not a bid, contract, or insurance guarantee. A physical inspection is required to confirm scope, code, and pricing.";

export function buildScheduleInspectionBlock(
  report: Pick<
    DamageRoofReport,
    "companyName" | "property" | "estimate" | "homeownerName"
  >,
  opts?: { aiClientMessage?: string },
): ScheduleInspectionBlock {
  const phone = getInspectionPhone();
  const email = getInspectionEmail();
  const company = report.companyName?.trim() || "our team";
  const addr = report.property?.address?.trim() || "your property";
  const who = report.homeownerName?.trim();

  const est = report.estimate;
  const rangeLine =
    est &&
    typeof est.lowCostUsd === "number" &&
    typeof est.highCostUsd === "number" &&
    est.lowCostUsd >= 0 &&
    est.highCostUsd >= est.lowCostUsd
      ? `The preliminary ballpark in this report is $${est.lowCostUsd.toLocaleString()} – $${est.highCostUsd.toLocaleString()} (roof + selected non-roof items as entered). `
      : "";

  const contactBits: string[] = [];
  if (phone) contactBits.push(`call ${phone}`);
  if (email) contactBits.push(`email ${email}`);
  const contact =
    contactBits.length > 0
      ? `Please ${contactBits.join(" or ")} to schedule a no-obligation on-site inspection.`
      : "Please contact us using the information on file to schedule a no-obligation on-site inspection.";

  const body = [
    who ? `${who}, ` : "",
    `${rangeLine}${contact} We will walk the roof, document conditions with photos, and align next steps with you.`,
    ` Property: ${addr}.`,
  ].join("");

  return {
    headline: `Schedule an inspection with ${company}`,
    body: body.replace(/\s+/g, " ").trim(),
    phone,
    email,
    disclaimer: DEFAULT_DISCLAIMER,
    aiClientMessage: opts?.aiClientMessage?.trim() || undefined,
  };
}
