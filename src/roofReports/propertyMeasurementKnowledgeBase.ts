/**
 * Bundled example property measurement / roof report PDFs (MN) for field reference
 * when tracing roofs and filling measurements. Files live in
 * `assets/property-measurement-knowledge/`.
 */

import { Asset } from "expo-asset";
import * as Linking from "expo-linking";

export const PROPERTY_MEASUREMENT_KB_TITLE =
  "Reference measurement reports (knowledge base)";

export const PROPERTY_MEASUREMENT_KB_DESCRIPTION =
  "Example roof measurement PDFs (Minnesota) — open to compare layout, areas, and report style while you trace or review.";

export const PROPERTY_MEASUREMENT_REFERENCE_DOCS: ReadonlyArray<{
  id: string;
  shortLabel: string;
  pdfModule: number;
}> = [
  {
    id: "1773-summit-st-paul",
    shortLabel: "1773 Summit Ave, Saint Paul, MN 55105",
    pdfModule: require("@/assets/property-measurement-knowledge/1773_Summit_Avenue_Saint_Paul_MN_55105.pdf"),
  },
  {
    id: "1122-dayton-st-paul",
    shortLabel: "1122 Dayton Ave, Saint Paul, MN 55104",
    pdfModule: require("@/assets/property-measurement-knowledge/1122_Dayton_Avenue_Saint_Paul_MN_55104.pdf"),
  },
  {
    id: "1374-westminster-st-paul",
    shortLabel: "1374 Westminster St, Saint Paul, MN 55130",
    pdfModule: require("@/assets/property-measurement-knowledge/1374_Westminster_Street_Saint_Paul_MN_55130.pdf"),
  },
  {
    id: "1502-broadway-mpls",
    shortLabel: "1502 W Broadway, Minneapolis, MN 55411",
    pdfModule: require("@/assets/property-measurement-knowledge/1502_W_Broadway_Minneapolis_MN_55411.pdf"),
  },
  {
    id: "7270-hillsdale-chanhassen",
    shortLabel: "7270 Hillsdale Ct, Chanhassen, MN 55317",
    pdfModule: require("@/assets/property-measurement-knowledge/7270_Hillsdale_Court_Chanhassen_MN_55317.pdf"),
  },
];

/** Opens the bundled PDF in the system viewer / new browser tab. */
export async function openPropertyMeasurementPdf(pdfModule: number) {
  const asset = Asset.fromModule(pdfModule);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (uri) await Linking.openURL(uri);
}

export function propertyMeasurementKbExportLines(): string[] {
  return PROPERTY_MEASUREMENT_REFERENCE_DOCS.map((d) => d.shortLabel);
}
