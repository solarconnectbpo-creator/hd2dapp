import { Alert, Linking } from "react-native";

/**
 * EagleView Property Data API v2 — property-centric measurements and structure.
 * OAuth2 credentials must not ship in the client; call from a secure backend or proxy.
 *
 * @see https://developer.eagleview.com/documentation/property-data/v2/api-documentation
 */
export const EAGLEVIEW_PROPERTY_DATA_V2_DOC_URL =
  "https://developer.eagleview.com/documentation/property-data/v2/api-documentation";

export async function openEagleViewPropertyDataV2Docs(): Promise<void> {
  try {
    const ok = await Linking.canOpenURL(EAGLEVIEW_PROPERTY_DATA_V2_DOC_URL);
    if (!ok) {
      Alert.alert("Cannot open link", EAGLEVIEW_PROPERTY_DATA_V2_DOC_URL);
      return;
    }
    await Linking.openURL(EAGLEVIEW_PROPERTY_DATA_V2_DOC_URL);
  } catch {
    Alert.alert(
      "Could not open EagleView docs",
      "Open Property Data API v2 documentation in your browser.",
    );
  }
}
