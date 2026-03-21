import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderHeightContext } from "@react-navigation/elements";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";

import { Spacing } from "@/constants/theme";

/** When outside a stack with a header / tab bar, hooks throw — use context + defaults instead. */
const DEFAULT_HEADER_HEIGHT = 56;

export function useScreenInsets() {
  const insets = useSafeAreaInsets();
  const headerHeight = React.useContext(HeaderHeightContext) ?? DEFAULT_HEADER_HEIGHT;
  const tabBarHeight = React.useContext(BottomTabBarHeightContext) ?? 0;

  return {
    paddingTop: headerHeight + Spacing.xl,
    paddingBottom: tabBarHeight + Spacing.xl,
    scrollInsetBottom: insets.bottom + 16,
  };
}
