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
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { HeroLogo } from "@/components/HeroLogo";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import {
  Spacing,
  BorderRadius,
  AppColors,
  Typography,
} from "@/constants/theme";
import type { AuthStackParamList } from "@/navigation/AuthNavigator";

type AdminLoginScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList>;
};

export default function AdminLoginScreen({
  navigation,
}: AdminLoginScreenProps) {
  const { theme } = useTheme();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("admin@hardcoredoortodoorclosers.com");
  const [password, setPassword] = useState("AdminTest123!");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsLoading(true);
    const result = await login(email, password, "admin");
    setIsLoading(false);

    if (result?.requires2FA) {
      navigation.navigate("Verify2FA", { email: result.email || email });
    } else if (!result) {
      Alert.alert("Login Failed", "Invalid admin credentials");
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
          <HeroLogo />

          <View style={styles.header}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: "#8B5CF6" + "20" },
              ]}
            >
              <Feather name="lock" size={32} color="#8B5CF6" />
            </View>
            <ThemedText type="h2" style={styles.title}>
              Admin Login
            </ThemedText>
            <ThemedText
              style={[styles.subtitle, { color: theme.textSecondary }]}
            >
              Access the HD2D administration panel
            </ThemedText>
          </View>

          <View style={styles.form}>
            <View style={styles.formField}>
              <ThemedText style={styles.label}>Admin Email</ThemedText>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: theme.backgroundDefault },
                ]}
              >
                <Feather
                  name="mail"
                  size={20}
                  color={theme.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter admin email"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            <View style={styles.formField}>
              <ThemedText style={styles.label}>Password</ThemedText>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: theme.backgroundDefault },
                ]}
              >
                <Feather
                  name="lock"
                  size={20}
                  color={theme.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color={theme.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            <Button
              onPress={handleLogin}
              disabled={isLoading}
              style={[styles.loginButton, { backgroundColor: "#8B5CF6" }]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                "Log In as Admin"
              )}
            </Button>

            <ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
              Demo: Use email: admin@hardcoredoortodoorclosers.com, password:
              AdminTest123!
            </ThemedText>
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
    marginBottom: Spacing["3xl"],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 15,
  },
  form: {
    gap: Spacing.xl,
  },
  formField: {
    gap: Spacing.sm,
  },
  label: {
    fontWeight: "600",
    fontSize: 15,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
  },
  eyeButton: {
    padding: Spacing.sm,
  },
  loginButton: {
    marginTop: Spacing.lg,
  },
  hint: {
    textAlign: "center",
    fontSize: 12,
    marginTop: Spacing.md,
  },
});

