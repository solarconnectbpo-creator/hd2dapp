import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ReportsHomeScreen from "@/screens/RoofReports/ReportsHomeScreen";
import PropertyMapPickerScreen from "@/screens/RoofReports/PropertyMapPickerScreen";
import CreateDamageRoofReportScreen from "@/screens/RoofReports/CreateDamageRoofReportScreen";
import ReportPreviewScreen from "@/screens/RoofReports/ReportPreviewScreen";

import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import type { DamageRoofReport, PropertySelection } from "@/src/roofReports/roofReportTypes";

export type ReportsStackParamList = {
  ReportsHome: undefined;
  PropertyMapPicker: undefined;
  CreateDamageRoofReport: {
    property: PropertySelection;
    mode?: "full" | "estimate";
    /** After pick: web auto-traces footprint (if available), fills estimate, opens preview. */
    autoBuildReport?: boolean;
  };
  ReportPreview: { report: DamageRoofReport };
};

const Stack = createNativeStackNavigator<ReportsStackParamList>();

export default function ReportsStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="ReportsHome"
        component={ReportsHomeScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Roof Reports" />,
        }}
      />

      <Stack.Screen
        name="PropertyMapPicker"
        component={PropertyMapPickerScreen}
        options={{
          headerTitle: "Pick Property",
        }}
      />

      <Stack.Screen
        name="CreateDamageRoofReport"
        component={CreateDamageRoofReportScreen}
        options={{
          headerTitle: "Damage Report",
        }}
      />

      <Stack.Screen
        name="ReportPreview"
        component={ReportPreviewScreen}
        options={{
          headerTitle: "Preview / Export",
        }}
      />
    </Stack.Navigator>
  );
}

