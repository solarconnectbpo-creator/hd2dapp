import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import JobsScreen from "@/screens/JobsScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type JobsStackParamList = {
  Jobs: undefined;
  JobDetail: { jobId: string };
};

const Stack = createNativeStackNavigator<JobsStackParamList>();

export default function JobsStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Jobs"
        component={JobsScreen}
        options={{
          headerTitle: "Jobs",
        }}
      />
    </Stack.Navigator>
  );
}
