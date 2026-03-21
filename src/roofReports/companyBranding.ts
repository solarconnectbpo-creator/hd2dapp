import type { DamageRoofReport } from "./roofReportTypes";
import { getDefaultDamageReportCompanyLogoUri } from "./coxRoofingLogoAsset";

const COX_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="120" viewBox="0 0 520 120" role="img" aria-label="Cox Roofing">
  <rect width="520" height="120" rx="14" fill="#0f172a"/>
  <text x="26" y="78" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="800" fill="#f59e0b">COX</text>
  <text x="202" y="78" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="700" fill="#ffffff">ROOFING</text>
</svg>`;

/** Fallback when the bundled PNG cannot be resolved (e.g. unusual runtime). */
export const COX_LOGO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(COX_LOGO_SVG)}`;

function envCompanyLogoUrl(): string | undefined {
  const envLogo =
    typeof process !== "undefined" &&
    (process as { env?: Record<string, string | undefined> })?.env
      ? ((process as { env?: Record<string, string | undefined> }).env
          ?.EXPO_PUBLIC_COX_LOGO_URL ??
        (process as { env?: Record<string, string | undefined> }).env
          ?.EXPO_PUBLIC_DEFAULT_COMPANY_LOGO_URL)
      : undefined;
  return envLogo?.trim() || undefined;
}

/** Whether the report should use the default Cox Roofing artwork (bundled PNG). */
function shouldUseDefaultCoxLogo(companyName?: string): boolean {
  const n = (companyName ?? "").trim().toLowerCase();
  if (!n) return true;
  return n.includes("cox");
}

function resolveDefaultCoxLogoUri(): string {
  return getDefaultDamageReportCompanyLogoUri() ?? COX_LOGO_DATA_URL;
}

export function getCompanyLogoUrl(
  report: DamageRoofReport,
): string | undefined {
  if (report.companyLogoUrl?.trim()) return report.companyLogoUrl.trim();

  const env = envCompanyLogoUrl();
  if (env) return env;

  if (shouldUseDefaultCoxLogo(report.companyName)) {
    return resolveDefaultCoxLogoUri();
  }
  return undefined;
}

export function getCompanyLogoUrlByName(
  companyName?: string,
): string | undefined {
  const env = envCompanyLogoUrl();
  if (env) return env;

  if (shouldUseDefaultCoxLogo(companyName)) {
    return resolveDefaultCoxLogoUri();
  }
  return undefined;
}

export function getIntroNarrative(companyName?: string): string {
  const n = (companyName ?? "").toLowerCase();
  if (n.includes("cox")) {
    return "Thank you for trusting Cox Roofing with your property. We focus on clear documentation, storm-related damage verification, and straightforward communication so nothing important is missed during the claim and restoration process.";
  }
  return "Thank you for trusting our team with your property inspection. This report summarizes observed conditions, photo documentation, and estimate context so you can make informed repair decisions.";
}
