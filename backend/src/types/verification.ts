/**
 * Lead Verification Types
 */

export type LeadVerificationStatus = 
  | "APPROVED" 
  | "SOFT-APPROVED" 
  | "MANUAL_REVIEW" 
  | "REJECTED" 
  | "VENDOR_FRAUD_FLAGGED";

export interface VerificationResult {
  status: LeadVerificationStatus;
  risk: number;
  quality: number;
  reason: string;
  actions: string[];
}

export interface LeadVerificationData {
  isReal: boolean;
  intent: "high" | "medium" | "low";
  riskScore: number;
  qualityScore: number;
  recycledLead: boolean;
  spam: boolean;
  tcpaSafe: boolean;
  justification: string;
  phone: any;
  email: any;
  vendorScore: any;
}
