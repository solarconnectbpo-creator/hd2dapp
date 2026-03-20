import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "@/hooks/useTheme";
import AdminScreen from "@/screens/AdminScreen";

export type AdminStackParamList = {
  AdminDashboard: undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export default function AdminNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.backgroundRoot,
        },
      }}
    >
      <Stack.Screen
        name="AdminDashboard"
        component={AdminScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
