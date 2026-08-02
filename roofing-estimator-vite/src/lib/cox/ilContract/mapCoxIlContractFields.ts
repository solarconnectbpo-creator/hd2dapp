import type { ProposalState } from "../../../features/measurement/proposalTypes";
import { emptyCoxIlContractFields, type CoxIlContractFields } from "./coxIlContractTypes";

/** Split a US-ish address line into street vs city/state/zip when possible. */
export function splitLossAddress(address: string): { lossAddress: string; cityStateZip: string } {
  const raw = (address || "").trim();
  if (!raw) return { lossAddress: "", cityStateZip: "" };
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    return {
      lossAddress: parts[0] || "",
      cityStateZip: parts.slice(1).join(", "),
    };
  }
  if (parts.length === 2) {
    return { lossAddress: parts[0] || "", cityStateZip: parts[1] || "" };
  }
  return { lossAddress: raw, cityStateZip: "" };
}

export function mapCoxIlContractFields(args: {
  proposal: ProposalState;
  address: string;
  stateCode?: string;
  propertyNotes?: string;
  contractDate?: string;
}): CoxIlContractFields {
  const { lossAddress, cityStateZip } = splitLossAddress(args.address);
  const state = (args.stateCode || "").trim().toUpperCase();
  let cityZip = cityStateZip;
  if (cityZip && state && !new RegExp(`\\b${state}\\b`, "i").test(cityZip) && !/illinois/i.test(cityZip)) {
    cityZip = `${cityZip}, ${state}`;
  } else if (!cityZip && state) {
    cityZip = state === "IL" ? "IL" : state;
  }

  return emptyCoxIlContractFields({
    contractDate: args.contractDate || new Date().toLocaleDateString(),
    customerName: args.proposal.clientName || "",
    primaryPhone: args.proposal.clientPhone || "",
    secondaryPhone: "",
    lossAddress,
    cityStateZip: cityZip,
    email: args.proposal.clientEmail || "",
    dateOfLoss: "",
    insuranceCompany: "",
    claimNumber: "",
    notes: (args.propertyNotes || "").trim().slice(0, 500),
    contractorRepName: args.proposal.preparedBy || "",
  });
}
