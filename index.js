import "react-native-gesture-handler";
import { Platform } from "react-native";
import { enableScreens } from "react-native-screens";
import { registerRootComponent } from "expo";

import App from "@/App";

// Native screens + RN Web often yields an empty tree; JS screens are stable on web.
if (Platform.OS === "web") {
  enableScreens(false);
}

registerRootComponent(App);
