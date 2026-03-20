import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CRMScreen from "@/screens/CRMScreen";
import CallCenterScreen from "@/screens/CallCenterScreen";
import DealsBoardScreen from "@/screens/DealsBoardScreen";
import DealDetailScreen from "@/screens/DealDetailScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type CRMStackParamList = {
  CRM: undefined;
  DealsBoard: undefined;
  DealDetail: { dealId: string };
  CallCenter: undefined;
};

const Stack = createNativeStackNavigator<CRMStackParamList>();

export default function CRMStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="CRM"
        component={CRMScreen}
        options={{
          headerTitle: "Pipeline",
        }}
      />
      <Stack.Screen
        name="DealsBoard"
        component={DealsBoardScreen}
        options={{
          headerTitle: "Kanban Board",
        }}
      />
      <Stack.Screen
        name="DealDetail"
        component={DealDetailScreen}
        options={{
          headerTitle: "Deal Details",
        }}
      />
      <Stack.Screen
        name="CallCenter"
        component={CallCenterScreen}
        options={{
          headerTitle: "Call Center",
        }}
      />
    </Stack.Navigator>
  );
}
