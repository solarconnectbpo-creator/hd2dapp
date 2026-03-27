import { Alert, Linking } from "react-native";

import type { RoofMeasurements } from "./roofReportTypes";
export {
  flattenMeasurementsForExport,
  mergeEstimateRoofAreaIntoMeasurements,
  mergeManualRoofAreaIntoMeasurements,
  roofMeasurementsHaveContent,
} from "./roofMeasurementsMerge";

/** Marketing / docs repo (no SDK): https://github.com/eavemeasure/eavemeasure-aerial-roof-measurement */
export const EAVEMEASURE_GITHUB_README_URL =
  "https://github.com/eavemeasure/eavemeasure-aerial-roof-measurement";

/** Service page linked from that README */
export const EAVEMEASURE_AERIAL_SERVICES_URL =
  (typeof process !== "undefined" &&
    (process as { env?: Record<string, string | undefined> }).env
      ?.EXPO_PUBLIC_EAVEMEASURE_URL) ||
  "https://eavemeasure.com/aerial-roof-measurement-services/";

export const EAVEMEASURE_PROVIDER_LABEL = "EaveMeasure";

export async function openEaveMeasureAerialServices(): Promise<void> {
  const url = EAVEMEASURE_AERIAL_SERVICES_URL;
  try {
    const ok = await Linking.canOpenURL(url);
    if (!ok) {
      Alert.alert("Cannot open link", url);
      return;
    }
    await Linking.openURL(url);
  } catch (e) {
    console.error(e);
    Alert.alert(
      "Could not open EaveMeasure",
      "Copy the URL from the in-app caption and open it in your browser.",
    );
  }
}

export function mergeEaveMeasureFields(
  prev: RoofMeasurements,
  reference: string,
  reportUrl: string,
): RoofMeasurements {
  const ref = reference.trim();
  const url = reportUrl.trim();
  const next: RoofMeasurements = {
    ...prev,
    aerialMeasurementReference: ref || undefined,
    aerialMeasurementReportUrl: url || undefined,
  };
  if (ref || url) {
    next.aerialMeasurementProvider = EAVEMEASURE_PROVIDER_LABEL;
  } else {
    delete next.aerialMeasurementProvider;
  }
  return next;
}
