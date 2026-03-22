import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ReportsHomeScreen from "@/screens/RoofReports/ReportsHomeScreen";
import PropertyMapPickerScreen from "@/screens/RoofReports/PropertyMapPickerScreen";
import CreateDamageRoofReportScreen from "@/screens/RoofReports/CreateDamageRoofReportScreen";
import ReportPreviewScreen from "@/screens/RoofReports/ReportPreviewScreen";
import GISBuildingMapScreen from "@/screens/RoofReports/GISBuildingMapScreen";
import ComprehensiveRoof3DAssessmentRoute from "@/screens/RoofReports/ComprehensiveRoof3DAssessmentScreen";
import PrecisionMeasurementScreen from "@/app/screens/PrecisionMeasurementScreen";
import BulkCsvDamageReportsScreen from "@/screens/RoofReports/BulkCsvDamageReportsScreen";
import StLouisDataSourcesScreen from "@/screens/RoofReports/StLouisDataSourcesScreen";
import ReportsScreen from "@/src/screens/ReportsScreen";

import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import type {
  DamageRoofReport,
  PropertySelection,
  RoofPrecisionMeasurementSnapshot,
} from "@/src/roofReports/roofReportTypes";

export type ReportsStackParamList = {
  ReportsHome: undefined;
  AIReports: undefined;
  BulkCsvDamageReports: undefined;
  PropertyMapPicker: undefined;
  CreateDamageRoofReport: {
    property: PropertySelection;
    mode?: "full" | "estimate";
    autoBuildReport?: boolean;
    appliedPrecisionMeasurement?: RoofPrecisionMeasurementSnapshot;
  };
  ReportPreview: { report: DamageRoofReport };
  GISBuildingMap: {
    address: string;
    latitude: number;
    longitude: number;
    mapboxToken?: string;
  };
  ComprehensiveRoof3DAssessment:
    | {
        address: string;
        latitude: number;
        longitude: number;
      }
    | undefined;
  PrecisionMeasurement:
    | {
        address?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        latitude?: number;
        longitude?: number;
        returnToDamageReport?: {
          property: PropertySelection;
          mode?: "full" | "estimate";
          autoBuildReport?: boolean;
        };
      }
    | undefined;
  StLouisDataSources: { latitude?: number; longitude?: number } | undefined;
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
        name="AIReports"
        component={ReportsScreen}
        options={{
          headerTitle: "AI report agents",
        }}
      />

      <Stack.Screen
        name="BulkCsvDamageReports"
        component={BulkCsvDamageReportsScreen}
        options={{
          headerTitle: "Bulk CSV import",
        }}
      />

      <Stack.Screen
        name="StLouisDataSources"
        component={StLouisDataSourcesScreen}
        options={{
          headerTitle: "St. Louis data sources",
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

      <Stack.Screen
        name="GISBuildingMap"
        component={GISBuildingMapScreen}
        options={{
          headerTitle: "Building (OSM)",
        }}
      />

      <Stack.Screen
        name="ComprehensiveRoof3DAssessment"
        component={ComprehensiveRoof3DAssessmentRoute}
        options={{
          headerTitle: "Full roof assessment",
        }}
      />

      <Stack.Screen
        name="PrecisionMeasurement"
        component={PrecisionMeasurementScreen}
        options={{
          headerTitle: "Precision measurement",
        }}
      />
    </Stack.Navigator>
  );
}
