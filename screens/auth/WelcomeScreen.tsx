import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import type { AuthStackParamList } from "@/navigation/AuthNavigator";
import { HeroLogo } from "@/components/HeroLogo";

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Welcome">;
};

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const handlePress = async (userType: "sales_rep" | "company") => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    navigation.navigate("Login", { userType });
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + Spacing["3xl"] }]}>
        <View style={styles.header}>
          <HeroLogo />
          <ThemedText type="h1" style={styles.title}>
            Hardcore Closers
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            The #1 platform for sales professionals
          </ThemedText>
        </View>

        <View style={styles.options}>
          <Pressable
            onPress={() => handlePress("company")}
            style={({ pressed }) => [
              styles.optionCard,
              { backgroundColor: theme.backgroundDefault },
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={[styles.optionIcon, { backgroundColor: AppColors.primary + "20" }]}>
              <Feather name="log-in" size={28} color={AppColors.primary} />
            </View>
            <View style={styles.optionContent}>
              <ThemedText type="h3">User Login</ThemedText>
              <ThemedText style={[styles.optionDescription, { color: theme.textSecondary }]}>
                Sign in with your email and password
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={24} color={theme.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <ThemedText style={[styles.footerText, { color: theme.textSecondary }]}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 16,
    maxWidth: 280,
  },
  options: {
    gap: Spacing.lg,
  },
  optionsTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.lg,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  optionContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  optionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: Spacing["2xl"],
  },
  footerText: {
    textAlign: "center",
    fontSize: 12,
  },
});
