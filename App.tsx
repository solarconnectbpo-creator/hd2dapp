import React from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import AuthNavigator from "@/navigation/AuthNavigator";
import AdminNavigator from "@/navigation/AdminNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { InboundAgentsProvider } from "@/contexts/InboundAgentsContext";
import { PurchasedLeadsProvider } from "@/contexts/PurchasedLeadsContext";
import { useTheme } from "@/hooks/useTheme";
import { AppColors } from "@/constants/theme";

function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  if (isAuthenticated && user?.userType === "admin") {
    return <AdminNavigator />;
  }

  return isAuthenticated ? <MainTabNavigator /> : <AuthNavigator />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <KeyboardProvider>
            <AuthProvider>
              <InboundAgentsProvider>
                <PurchasedLeadsProvider>
                  <NavigationContainer>
                    <RootNavigator />
                  </NavigationContainer>
                  <StatusBar style="auto" />
                </PurchasedLeadsProvider>
              </InboundAgentsProvider>
            </AuthProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
