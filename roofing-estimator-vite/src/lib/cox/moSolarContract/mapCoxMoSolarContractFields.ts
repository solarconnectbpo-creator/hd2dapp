import type { ProposalState } from "../../../features/measurement/proposalTypes";
import { splitLossAddress } from "../ilContract/mapCoxIlContractFields";
import { emptyCoxMoSolarContractFields, type CoxMoSolarContractFields } from "./coxMoSolarContractTypes";

function formatContractSum(raw?: string | number): string {
  if (raw === undefined || raw === null || raw === "") return "";
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw <= 0) return "";
    return Math.round(raw).toLocaleString("en-US");
  }
  const t = raw.trim();
  if (!t) return "";
  const n = Number(t.replace(/[$,]/g, ""));
  if (Number.isFinite(n) && n > 0) return Math.round(n).toLocaleString("en-US");
  return t;
}

function buildSpecifications(args: {
  proposal: ProposalState;
  propertyNotes?: string;
  systemSizeKw?: string;
  panelCount?: string;
  inverter?: string;
}): string {
  const lines: string[] = [];
  if (args.proposal.proposalTitle.trim()) lines.push(args.proposal.proposalTitle.trim());
  if (args.systemSizeKw?.trim()) lines.push(`System size: ${args.systemSizeKw.trim()} kW DC`);
  if (args.panelCount?.trim()) lines.push(`Module count: ${args.panelCount.trim()}`);
  if (args.inverter?.trim()) lines.push(`Inverter / ESS: ${args.inverter.trim()}`);
  if (args.proposal.inclusions.trim()) lines.push(args.proposal.inclusions.trim());
  if (args.propertyNotes?.trim()) lines.push(args.propertyNotes.trim().slice(0, 500));
  return lines.join("\n");
}

export function mapCoxMoSolarContractFields(args: {
  proposal: ProposalState;
  address: string;
  stateCode?: string;
  propertyNotes?: string;
  contractDate?: string;
  contractSum?: string | number;
  county?: string;
  utilityName?: string;
  systemSizeKw?: string;
  panelCount?: string;
  inverter?: string;
  ecLicenseNumber?: string;
}): CoxMoSolarContractFields {
  const { lossAddress, cityStateZip } = splitLossAddress(args.address);
  const state = (args.stateCode || "").trim().toUpperCase();
  let cityZip = cityStateZip;
  if (cityZip && state && !new RegExp(`\\b${state}\\b`, "i").test(cityZip) && !/missouri/i.test(cityZip)) {
    cityZip = `${cityZip}, ${state}`;
  } else if (!cityZip && state) {
    cityZip = state === "MO" ? "MO" : state;
  }

  return emptyCoxMoSolarContractFields({
    contractDate: args.contractDate || new Date().toLocaleDateString(),
    customerName: args.proposal.clientName || "",
    homePhone: args.proposal.contactPhone || "",
    cellPhone: args.proposal.clientPhone || "",
    email: args.proposal.clientEmail || "",
    streetAddress: lossAddress,
    cityStateZip: cityZip,
    county: args.county || "",
    specifications: buildSpecifications({
      proposal: args.proposal,
      propertyNotes: args.propertyNotes,
      systemSizeKw: args.systemSizeKw,
      panelCount: args.panelCount,
      inverter: args.inverter,
    }),
    contractSum: formatContractSum(args.contractSum),
    paymentTerms: args.proposal.paymentSchedule || "",
    warranty: args.proposal.warranty || "",
    exclusions: args.proposal.exclusions || "",
    financingNotes: args.proposal.financingNotes || "",
    utilityName: args.utilityName || "",
    systemSizeKw: args.systemSizeKw || "",
    panelCount: args.panelCount || "",
    inverter: args.inverter || "",
    contractorRepName: args.proposal.preparedBy || "",
    ecLicenseNumber: args.ecLicenseNumber || "",
  });
}
