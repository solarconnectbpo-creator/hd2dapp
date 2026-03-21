/**
 * Lead Status Determiner
 * Determines verification status based on verification data
 */

import type { LeadVerificationStatus, VerificationResult } from "../types/verification";

interface VerificationData {
  isReal?: boolean;
  intent?: "high" | "medium" | "low";
  riskScore?: number;
  qualityScore?: number;
  recycledLead?: boolean;
  spam?: boolean;
  tcpaSafe?: boolean;
  justification?: string;
  phone?: any;
  email?: any;
  vendorScore?: any;
}

export function determineVerificationStatus(data: VerificationData): VerificationResult {
  const riskScore = data.riskScore || 50;
  const qualityScore = data.qualityScore || 50;
  const isReal = data.isReal !== false;
  const phoneValid = data.phone?.valid || false;
  const emailValid = data.email?.valid || false;
  const recycledLead = data.recycledLead || false;
  const spam = data.spam || false;
  const tcpaSafe = data.tcpaSafe !== false;
  const vendorScore = data.vendorScore?.score || 50;

  let status: LeadVerificationStatus;
  let reason: string;
  const actions: string[] = [];

  // Vendor fraud check
  if (spam || recycledLead || vendorScore < 20) {
    status = "VENDOR_FRAUD_FLAGGED";
    reason = "Vendor fraud indicators detected (spam/recycled/low vendor score)";
    actions.push("alert_compliance", "block_vendor", "manual_review");
    return { status, risk: riskScore, quality: 0, reason, actions };
  }

  // Rejected cases
  if (!isReal || (!phoneValid && !emailValid) || riskScore > 85 || qualityScore < 20) {
    status = "REJECTED";
    reason = data.justification || "Lead failed verification checks";
    actions.push("discard_lead", "log_rejection");
    return { status, risk: riskScore, quality: qualityScore, reason, actions };
  }

  // Manual review needed
  if (riskScore > 60 || qualityScore < 40 || !tcpaSafe) {
    status = "MANUAL_REVIEW";
    reason = "Lead requires manual review due to moderate risk or compliance concerns";
    actions.push("route_to_compliance", "notify_admin", "hold_delivery");
    return { status, risk: riskScore, quality: qualityScore, reason, actions };
  }

  // Soft-approved (usable but risky)
  if (riskScore > 40 || qualityScore < 65) {
    status = "SOFT-APPROVED";
    reason = "Lead verified but has some risk factors - use with caution";
    actions.push("deliver_to_buyer", "start_workflow_crm", "notify_sales", "flag_for_review");
    return { status, risk: riskScore, quality: qualityScore, reason, actions };
  }

  // Fully approved
  status = "APPROVED";
  reason = "Contact verified and intent matched";
  actions.push("deliver_to_buyer", "start_workflow_crm", "notify_sales");

  return { status, risk: riskScore, quality: qualityScore, reason, actions };
}
