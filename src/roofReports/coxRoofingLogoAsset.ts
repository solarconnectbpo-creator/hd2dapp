import { Image } from "react-native";

/**
 * Official Cox Roofing logo bundled with the app (assets/brand/cox-roofing-logo.png).
 * Used as the default company logo on damage reports when no custom logo is set.
 */
const COX_ROOFING_LOGO = require("../../assets/brand/cox-roofing-logo.png");

export function getDefaultDamageReportCompanyLogoUri(): string | undefined {
  try {
    const src = Image.resolveAssetSource(COX_ROOFING_LOGO);
    const uri = src?.uri;
    return typeof uri === "string" && uri.length > 0 ? uri : undefined;
  } catch {
    return undefined;
  }
}
