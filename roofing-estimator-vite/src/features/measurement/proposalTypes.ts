export type ProposalProfile = "residential" | "commercial";

/** Client-facing proposal fields used by Proposal Builder and saved contract snapshots. */
export interface ProposalState {
  profile: ProposalProfile;
  companyName: string;
  companyAddress: string;
  companyWebsite: string;
  logoDataUrl: string;
  preparedBy: string;
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  contactEmail: string;
  contactPhone: string;
  proposalTitle: string;
  inclusions: string;
  exclusions: string;
  paymentSchedule: string;
  warranty: string;
  alternates: string;
  financingNotes: string;
}

export function isProposalProfile(v: unknown): v is ProposalProfile {
  return v === "residential" || v === "commercial";
}

/** Best-effort normalize of a stored proposal blob (older jobs / contracts). */
export function normalizeProposalState(
  raw: unknown,
  fallback: ProposalState,
): ProposalState {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const r = raw as Record<string, unknown>;
  const str = (key: keyof ProposalState, max = 8000): string => {
    const v = r[key];
    return typeof v === "string" ? v.slice(0, max) : fallback[key];
  };
  return {
    profile: isProposalProfile(r.profile) ? r.profile : fallback.profile,
    companyName: str("companyName", 500),
    companyAddress: str("companyAddress", 500),
    companyWebsite: str("companyWebsite", 500),
    logoDataUrl: str("logoDataUrl", 2_000_000),
    preparedBy: str("preparedBy", 200),
    clientName: str("clientName", 200),
    clientCompany: str("clientCompany", 200),
    clientEmail: str("clientEmail", 200),
    clientPhone: str("clientPhone", 80),
    contactEmail: str("contactEmail", 200),
    contactPhone: str("contactPhone", 80),
    proposalTitle: str("proposalTitle", 300),
    inclusions: str("inclusions"),
    exclusions: str("exclusions"),
    paymentSchedule: str("paymentSchedule"),
    warranty: str("warranty"),
    alternates: str("alternates"),
    financingNotes: str("financingNotes"),
  };
}
