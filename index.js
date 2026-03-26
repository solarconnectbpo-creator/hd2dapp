import "react-native-gesture-handler";
import { Platform } from "react-native";
import { enableScreens } from "react-native-screens";
import { registerRootComponent } from "expo";

import App from "@/App";

// Web: log uncaught errors to the console (DevTools) to debug white-screen crashes.
if (
  typeof window !== "undefined" &&
  typeof __DEV__ !== "undefined" &&
  __DEV__
) {
  const log = (label, err) => {
    // eslint-disable-next-line no-console
    console.error(`[${label}]`, err);
  };
  window.addEventListener("error", (event) => {
    log("window.error", event.error ?? event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    log("unhandledrejection", event.reason);
  });
}

// Native screens + RN Web often yields an empty tree; JS screens are stable on web.
if (Platform.OS === "web") {
  enableScreens(false);
}

registerRootComponent(App);
