/**
 * Company Types
 * Type definitions for multi-tenant company system
 */

export interface BrandingConfig {
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  loginBackground?: string;
  appName?: string;
}

export interface SMTPConfig {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  from?: string;
}

export interface Company {
  id: string;
  name: string;
  industry?: string;
  logo_url?: string;
  is_vendor: boolean;
  branding: BrandingConfig;
  custom_domain?: string;
  smtp_config?: SMTPConfig;
  sms_footer: string;
  ai_voice: string;
  created_at: string;
}

export interface VendorProduct {
  id: string;
  vendor_id: string;
  name: string;
  type:
    | "lead"
    | "appointment"
    | "live-transfer"
    | "data-list"
    | "call-center"
    | "job-candidate";
  vertical: string;
  description: string;
  price: number;
  price_type: "per-lead" | "subscription" | "bid" | "auction";
  delivery_method: "api" | "webhook" | "download" | "crm";
  settings: Record<string, any>;
  active: boolean;
  created_at: string;
}

export interface VendorProductOrder {
  id: string;
  buyer_id: string;
  vendor_id: string;
  product_id: string;
  quantity: number;
  amount: number;
  status: "pending" | "paid" | "delivered" | "failed";
  delivery_log: string;
  created_at: string;
}
