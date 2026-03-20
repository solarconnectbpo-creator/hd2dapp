import type { DamageRoofReport } from "./roofReportTypes";

const COX_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="120" viewBox="0 0 520 120" role="img" aria-label="Cox Roofing">
  <rect width="520" height="120" rx="14" fill="#0f172a"/>
  <text x="26" y="78" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="800" fill="#f59e0b">COX</text>
  <text x="202" y="78" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="700" fill="#ffffff">ROOFING</text>
</svg>`;

export const COX_LOGO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(COX_LOGO_SVG)}`;
const COX_LOGO_IMAGE_PATH =
  "C:/Users/sethk/.cursor/projects/C-Users-sethk-AppData-Local-Temp-b0c1c72b-894e-49d2-bb1f-930f9c091495/assets/c__Users_sethk_AppData_Roaming_Cursor_User_workspaceStorage_1769293404992_images_Screenshot_2026-03-13_at_9.55.46_AM-eea85f5d-6456-4c5c-8995-a441c633dbf4.png";
const COX_LOGO_FILE_URL = `file:///${COX_LOGO_IMAGE_PATH.replace(/\\/g, "/")}`;

export function getCompanyLogoUrl(report: DamageRoofReport): string | undefined {
  if (report.companyLogoUrl?.trim()) return report.companyLogoUrl.trim();

  const envLogo =
    typeof process !== "undefined" && (process as any)?.env
      ? ((process as any).env.EXPO_PUBLIC_COX_LOGO_URL as string | undefined)
      : undefined;
  if (envLogo?.trim()) return envLogo.trim();

  const name = (report.companyName ?? "").toLowerCase();
  if (name.includes("cox")) {
    // Prefer the provided real logo image in this workspace.
    if (typeof window !== "undefined") return COX_LOGO_FILE_URL;
    return COX_LOGO_IMAGE_PATH;
  }
  return undefined;
}

export function getCompanyLogoUrlByName(companyName?: string): string | undefined {
  const envLogo =
    typeof process !== "undefined" && (process as any)?.env
      ? ((process as any).env.EXPO_PUBLIC_COX_LOGO_URL as string | undefined)
      : undefined;
  if (envLogo?.trim()) return envLogo.trim();

  const name = (companyName ?? "").toLowerCase();
  if (name.includes("cox")) {
    if (typeof window !== "undefined") return COX_LOGO_FILE_URL;
    return COX_LOGO_IMAGE_PATH;
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
