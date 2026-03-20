import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "@/hooks/useTheme";
import WelcomeScreen from "@/screens/auth/WelcomeScreen";
import LoginScreen from "@/screens/auth/LoginScreen";
import SignupScreen from "@/screens/auth/SignupScreen";
import Verify2FAScreen from "@/screens/auth/Verify2FAScreen";
import { AppColors } from "@/constants/theme";
import type { UserType } from "@/contexts/AuthContext";

export type AuthStackParamList = {
  Welcome: undefined;
  Login: { userType: UserType };
  Signup: { userType: UserType };
  Verify2FA: { email: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.backgroundRoot,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: "600",
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: theme.backgroundRoot,
        },
      }}
    >
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={({ route }) => ({
          title: route.params.userType === "sales_rep" ? "Sales Rep Login" : "Company Login",
          headerBackTitle: "Back",
        })}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={({ route }) => ({
          title: route.params.userType === "sales_rep" ? "Sales Rep Sign Up" : "Company Sign Up",
          headerBackTitle: "Back",
        })}
      />
      <Stack.Screen
        name="Verify2FA"
        component={Verify2FAScreen}
        options={{
          title: "Verify Code",
          headerBackTitle: "Back",
        }}
      />
    </Stack.Navigator>
  );
}
