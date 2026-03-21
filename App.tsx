import React from "react";
import {
  Platform,
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  Pressable,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { PrecisionMeasurementScreen } from "@/app/screens/PrecisionMeasurementScreen";
import type { ReportsStackParamList } from "@/navigation/ReportsStackNavigator";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import AuthNavigator from "@/navigation/AuthNavigator";
import AdminNavigator from "@/navigation/AdminNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PurchasedLeadsProvider } from "@/contexts/PurchasedLeadsContext";
import { useTheme } from "@/hooks/useTheme";
import { AppColors } from "@/constants/theme";

const BOOTSTRAP_PRECISION =
  process.env.EXPO_PUBLIC_BOOTSTRAP_PRECISION_MEASUREMENT === "true";

/** Demo route params when launching the precision screen alone (see .env.example). */
const PRECISION_DEMO_PARAMS: NonNullable<
  ReportsStackParamList["PrecisionMeasurement"]
> = {
  address: "123 Main Street",
  city: "San Francisco",
  state: "CA",
  zipCode: "94102",
  latitude: 37.7749,
  longitude: -122.4194,
};

type PrecisionOnly = {
  PrecisionMeasurement: ReportsStackParamList["PrecisionMeasurement"];
};

const PrecisionBootstrapStack = createNativeStackNavigator<PrecisionOnly>();

/**
 * Standalone stack for `EXPO_PUBLIC_BOOTSTRAP_PRECISION_MEASUREMENT=true`.
 * Nearmap / EagleView credentials are read from env in ProductionMeasurementService
 * (e.g. EXPO_PUBLIC_NEARMAP_API_KEY, EXPO_PUBLIC_EAGLEVIEW_ACCESS_TOKEN or client id/secret),
 * not passed as React props.
 */
function PrecisionMeasurementBootstrap() {
  return (
    <NavigationContainer>
      <PrecisionBootstrapStack.Navigator>
        <PrecisionBootstrapStack.Screen
          name="PrecisionMeasurement"
          component={PrecisionMeasurementScreen}
          initialParams={PRECISION_DEMO_PARAMS}
          options={{ headerTitle: "Precision measurement" }}
        />
      </PrecisionBootstrapStack.Navigator>
    </NavigationContainer>
  );
}

function AppNavigation() {
  const { isAuthenticated, isLoading, user, error, clearError } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ActivityIndicator size="large" color={AppColors.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Loading...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.errorContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <Text style={[styles.errorTitle, { color: AppColors.error }]}>
          ⚠️ Error
        </Text>
        <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
        <Pressable
          onPress={clearError}
          style={({ pressed }) => [
            styles.dismissBtn,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={[styles.dismissText, { color: AppColors.primary }]}>
            Dismiss
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <NavigationContainer
      fallback={
        <View style={styles.fallbackContainer}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      }
    >
      {isAuthenticated && user?.userType === "admin" ? (
        <AdminNavigator />
      ) : isAuthenticated ? (
        <MainTabNavigator />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}

/** Shared tree; KeyboardProvider is omitted on web (keyboard-controller can break the web bundle). */
function AppShell() {
  return (
    <AuthProvider>
      <PurchasedLeadsProvider>
        <AppNavigation />
        <StatusBar style="auto" />
      </PurchasedLeadsProvider>
    </AuthProvider>
  );
}

export default function App() {
  if (BOOTSTRAP_PRECISION) {
    if (Platform.OS === "web") {
      return (
        <ErrorBoundary>
          <SafeAreaProvider>
            <View style={styles.root}>
              <PrecisionMeasurementBootstrap />
              <StatusBar style="auto" />
            </View>
          </SafeAreaProvider>
        </ErrorBoundary>
      );
    }
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.root}>
            <KeyboardProvider>
              <PrecisionMeasurementBootstrap />
              <StatusBar style="auto" />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  if (Platform.OS === "web") {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <View style={styles.root}>
            <AppShell />
          </View>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <KeyboardProvider>
            <AppShell />
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
  },
  dismissBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  dismissText: {
    fontSize: 16,
    fontWeight: "600",
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
