import React, { useState } from "react";
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
import { HeroLogo } from "@/components/HeroLogo";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, AppColors, Typography } from "@/constants/theme";
import type { AuthStackParamList } from "@/navigation/AuthNavigator";

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Login">;
  route: RouteProp<AuthStackParamList, "Login">;
};

export default function LoginScreen({ navigation, route }: LoginScreenProps) {
  const { userType } = route.params;
  const { theme } = useTheme();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  const [selectedUserType, setSelectedUserType] = useState<"company" | "sales_rep" | "admin">(userType || "company");
  const [email, setEmail] = useState(userType === "admin" ? "admin@hardcoredoortodoorclosers.com" : "");
  const [password, setPassword] = useState(userType === "admin" ? "AdminTest123!" : "");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const accentColor = "#000000"; // Unified black to match branding

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsLoading(true);
    const result = await login(email, password, selectedUserType);
    setIsLoading(false);

    if (result?.requires2FA) {
      navigation.navigate("Verify2FA", { email: result.email || email });
    } else if (!result) {
      Alert.alert("Login Failed", "Invalid email or password. Please try again or sign up.");
    }
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: theme.backgroundDefault, color: theme.text },
  ];

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
            <HeroLogo />
            <ThemedText type="h2" style={styles.title}>
              {selectedUserType === "admin" ? "Admin Login" : "User Login"}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              {selectedUserType === "admin" ? "Sign in to administer the platform" : "Sign in to your account"}
            </ThemedText>
            <Pressable
              onPress={() => {
                const nextType = selectedUserType === "admin" ? "company" : "admin";
                setSelectedUserType(nextType);
                if (nextType === "admin") {
                  setEmail("admin@hardcoredoortodoorclosers.com");
                  setPassword("AdminTest123!");
                } else {
                  setEmail("");
                  setPassword("");
                }
              }}
              style={{ marginTop: Spacing.sm }}
            >
              <ThemedText style={{ color: accentColor, fontWeight: "600" }}>
                {selectedUserType === "admin" ? "Switch to User Login" : "Admin? Tap here"}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.form}>
            <View style={styles.formField}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault }]}>
                <Feather name="mail" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            <View style={styles.formField}>
              <ThemedText style={styles.label}>Password</ThemedText>
              <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault }]}>
                <Feather name="lock" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color={theme.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable style={styles.forgotPassword}>
              <ThemedText style={{ color: "#000000", fontWeight: "600" }}>Forgot Password?</ThemedText>
            </Pressable>

            <Button
              onPress={handleLogin}
              disabled={isLoading}
              style={[styles.loginButton, { backgroundColor: "#000000" }]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                "Log In"
              )}
            </Button>

            {userType === "admin" && (
              <ThemedText style={[styles.adminHint, { color: theme.textSecondary }]}>
                Test admin credentials prefilled above.
              </ThemedText>
            )}
          </View>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <ThemedText style={[styles.dividerText, { color: theme.textSecondary }]}>
              or
            </ThemedText>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          <View style={styles.footer}>
            <ThemedText style={{ color: theme.textSecondary }}>
              Don't have an account?{" "}
            </ThemedText>
            <Pressable onPress={() => navigation.navigate("Signup", { userType })}>
              <ThemedText style={{ color: "#000000", fontWeight: "700" }}>
                Sign Up
              </ThemedText>
            </Pressable>
          </View>
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
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 15,
    maxWidth: 280,
  },
  form: {
    gap: Spacing.lg,
  },
  formField: {
    gap: Spacing.sm,
  },
  label: {
    fontWeight: "500",
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  textInput: {
    flex: 1,
    fontSize: Typography.body.fontSize,
    height: "100%",
  },
  eyeButton: {
    padding: Spacing.sm,
    marginRight: -Spacing.sm,
  },
  input: {
    height: 56,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.body.fontSize,
  },
  forgotPassword: {
    alignSelf: "flex-end",
  },
  loginButton: {
    marginTop: Spacing.md,
  },
  adminHint: {
    textAlign: "center",
    fontSize: 12,
    marginTop: Spacing.sm,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing["2xl"],
    gap: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
});
