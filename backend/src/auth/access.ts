import type { AuthRole } from "./token";
import type { DbUserRow } from "./userDb";

export type ApprovalStatus = "pending" | "approved" | "rejected";
export type BillingStatus = "unpaid" | "active" | "past_due" | "canceled";

export type AccessGateEnv = {
  /** When "true", skip approval/payment checks (local dev / emergency). */
  AUTH_SKIP_ACCESS_GATE?: string;
};

export type AccessEvaluation = {
  accessGranted: boolean;
  approval_status: ApprovalStatus;
  billing_status: BillingStatus;
  /** Human-readable blockers when accessGranted is false. */
  reasons: string[];
};

function parseApproval(raw: string | null | undefined): ApprovalStatus {
  const s = (raw || "").trim().toLowerCase();
  if (s === "approved" || s === "rejected" || s === "pending") return s;
  return "pending";
}

function parseBilling(raw: string | null | undefined): BillingStatus {
  const s = (raw || "").trim().toLowerCase();
  if (s === "active" || s === "unpaid" || s === "past_due" || s === "canceled") return s;
  return "unpaid";
}

export function rowAccessFields(row: DbUserRow): { approval_status: ApprovalStatus; billing_status: BillingStatus } {
  return {
    approval_status: parseApproval(row.approval_status),
    billing_status: parseBilling(row.billing_status),
  };
}

export function evaluateAccess(
  env: AccessGateEnv,
  jwtRole: AuthRole,
  row: DbUserRow | null,
): AccessEvaluation {
  const skip = (env.AUTH_SKIP_ACCESS_GATE || "").trim().toLowerCase() === "true";
  if (jwtRole === "admin" || skip) {
    const a = row ? parseApproval(row.approval_status) : "approved";
    const b = row ? parseBilling(row.billing_status) : "active";
    return { accessGranted: true, approval_status: a, billing_status: b, reasons: [] };
  }
  if (!row) {
    return {
      accessGranted: false,
      approval_status: "pending",
      billing_status: "unpaid",
      reasons: ["Account record not found. Try signing in again after migrations run."],
    };
  }
  const approval_status = parseApproval(row.approval_status);
  const billing_status = parseBilling(row.billing_status);
  const reasons: string[] = [];
  if (approval_status === "pending") reasons.push("Waiting for admin approval.");
  if (approval_status === "rejected") reasons.push("Your application was not approved.");
  if (billing_status !== "active") {
    if (billing_status === "unpaid") reasons.push("Membership payment is required.");
    else if (billing_status === "past_due") reasons.push("Your subscription is past due.");
    else if (billing_status === "canceled") reasons.push("Your subscription is not active.");
  }
  const accessGranted = approval_status === "approved" && billing_status === "active";
  return { accessGranted, approval_status, billing_status, reasons };
}
