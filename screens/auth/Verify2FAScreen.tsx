import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  BorderRadius,
  AppColors,
  Typography,
} from "@/constants/theme";
import type { AuthStackParamList } from "@/navigation/AuthNavigator";
import { apiClient } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

type Verify2FAScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Verify2FA">;
  route: RouteProp<AuthStackParamList, "Verify2FA">;
};

export default function Verify2FAScreen({
  navigation,
  route,
}: Verify2FAScreenProps) {
  const { email } = route.params;
  const { theme } = useTheme();
  const { loginWithToken } = useAuth();
  const insets = useSafeAreaInsets();

  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          Alert.alert(
            "Code Expired",
            "2FA code has expired. Please request a new one.",
          );
          navigation.goBack();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const handleVerify = async () => {
    if (!code.trim() || code.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiClient.verify2FA(email, code);
      if (result.token && result.user) {
        await loginWithToken(result.token, result.user);
      }
    } catch (error) {
      Alert.alert(
        "Verification Failed",
        error instanceof Error ? error.message : "Invalid code",
      );
      setCode("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await apiClient.resend2FA(email);
      Alert.alert("Code Sent", "A new 2FA code has been sent");
      setTimeLeft(300);
      setCode("");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to resend code",
      );
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: AppColors.primary + "20" },
              ]}
            >
              <Feather name="shield" size={32} color={AppColors.primary} />
            </View>
            <ThemedText type="h2" style={styles.title}>
              Two-Factor Authentication
            </ThemedText>
            <ThemedText
              style={[styles.subtitle, { color: theme.textSecondary }]}
            >
              Enter the 6-digit code sent to your email
            </ThemedText>
            <ThemedText style={[styles.email, { color: theme.textSecondary }]}>
              {email}
            </ThemedText>
            <View
              style={[
                styles.devNotice,
                { backgroundColor: AppColors.primary + "15" },
              ]}
            >
              <ThemedText
                style={[styles.devNoticeText, { color: AppColors.primary }]}
              >
                Development mode: Use any 6-digit code (e.g., 123456)
              </ThemedText>
            </View>
          </View>

          <View style={styles.codeContainer}>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <Feather
                name="lock"
                size={20}
                color={theme.textSecondary}
                style={styles.icon}
              />
              <TextInput
                style={[styles.codeInput, { color: theme.text }]}
                value={code}
                onChangeText={(text) =>
                  setCode(text.replace(/[^0-9]/g, "").slice(0, 6))
                }
                placeholder="000000"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                maxLength={6}
                editable={!isLoading}
              />
            </View>

            <View
              style={[
                styles.timer,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <Feather name="clock" size={18} color={theme.textSecondary} />
              <ThemedText
                style={[styles.timerText, { color: theme.textSecondary }]}
              >
                Code expires in {minutes}:{seconds.toString().padStart(2, "0")}
              </ThemedText>
            </View>
          </View>

          <Button
            onPress={handleVerify}
            disabled={isLoading || code.length !== 6}
            style={[
              styles.verifyButton,
              { backgroundColor: AppColors.primary },
            ]}
          >
            {isLoading ? <ActivityIndicator color="#FFFFFF" /> : "Verify Code"}
          </Button>

          <Pressable
            onPress={handleResend}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.resendButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <ThemedText style={{ color: AppColors.primary, fontSize: 15 }}>
              Didn't receive code? Resend
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 15,
    marginBottom: Spacing.md,
  },
  email: {
    fontSize: 14,
    fontWeight: "600",
  },
  codeContainer: {
    gap: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 80,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
  },
  icon: {
    marginRight: Spacing.lg,
  },
  codeInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: "600",
    letterSpacing: 8,
    textAlign: "center",
  },
  timer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  timerText: {
    fontSize: 13,
    fontWeight: "500",
  },
  verifyButton: {
    marginTop: Spacing.md,
  },
  resendButton: {
    alignItems: "center",
    marginTop: Spacing["2xl"],
    paddingVertical: Spacing.lg,
  },
  devNotice: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  devNoticeText: {
    fontSize: 13,
    textAlign: "center",
    fontWeight: "500",
  },
});
