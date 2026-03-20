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
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, AppColors, Typography } from "@/constants/theme";
import type { AuthStackParamList } from "@/navigation/AuthNavigator";

type SignupScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Signup">;
  route: RouteProp<AuthStackParamList, "Signup">;
};

export default function SignupScreen({ navigation, route }: SignupScreenProps) {
  const { userType } = route.params;
  const { theme } = useTheme();
  const { signup } = useAuth();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isSalesRep = userType === "sales_rep";
  const accentColor = isSalesRep ? AppColors.primary : AppColors.secondary;

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (!isSalesRep && !company.trim()) {
      Alert.alert("Error", "Please enter your company name");
      return;
    }

    setIsLoading(true);
    const result = await signup({
      email,
      password,
      name,
      userType,
      company: isSalesRep ? company : company,
      phone,
    });
    setIsLoading(false);

    if (result?.requires2FA) {
      navigation.navigate("Verify2FA", { email: result.email || email });
    } else if (!result) {
      Alert.alert("Signup Failed", "An account with this email already exists or there was an error.");
    }
  };

  const renderInput = (
    icon: keyof typeof Feather.glyphMap,
    placeholder: string,
    value: string,
    onChangeText: (text: string) => void,
    options: {
      keyboardType?: "default" | "email-address" | "phone-pad";
      autoCapitalize?: "none" | "sentences" | "words";
      secureTextEntry?: boolean;
    } = {}
  ) => (
    <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault }]}>
      <Feather name={icon} size={20} color={theme.textSecondary} style={styles.inputIcon} />
      <TextInput
        style={[styles.textInput, { color: theme.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        keyboardType={options.keyboardType || "default"}
        autoCapitalize={options.autoCapitalize || "sentences"}
        secureTextEntry={options.secureTextEntry && !showPassword}
      />
      {options.secureTextEntry ? (
        <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
          <Feather
            name={showPassword ? "eye-off" : "eye"}
            size={20}
            color={theme.textSecondary}
          />
        </Pressable>
      ) : null}
    </View>
  );

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
            <View style={[styles.iconContainer, { backgroundColor: accentColor + "20" }]}>
              <Feather
                name={isSalesRep ? "user-plus" : "briefcase"}
                size={32}
                color={accentColor}
              />
            </View>
            <ThemedText type="h2" style={styles.title}>
              {isSalesRep ? "Join as Sales Rep" : "Register Company"}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              {isSalesRep
                ? "Start closing more deals today"
                : "Connect with top sales talent"}
            </ThemedText>
          </View>

          <View style={styles.form}>
            <View style={styles.formField}>
              <ThemedText style={styles.label}>
                {isSalesRep ? "Full Name" : "Contact Name"} *
              </ThemedText>
              {renderInput("user", isSalesRep ? "John Smith" : "Contact person name", name, setName, {
                autoCapitalize: "words",
              })}
            </View>

            {!isSalesRep ? (
              <View style={styles.formField}>
                <ThemedText style={styles.label}>Company Name *</ThemedText>
                {renderInput("briefcase", "Your company name", company, setCompany, {
                  autoCapitalize: "words",
                })}
              </View>
            ) : null}

            <View style={styles.formField}>
              <ThemedText style={styles.label}>Email *</ThemedText>
              {renderInput("mail", "you@example.com", email, setEmail, {
                keyboardType: "email-address",
                autoCapitalize: "none",
              })}
            </View>

            <View style={styles.formField}>
              <ThemedText style={styles.label}>Phone</ThemedText>
              {renderInput("phone", "(555) 123-4567", phone, setPhone, {
                keyboardType: "phone-pad",
              })}
            </View>

            {isSalesRep ? (
              <View style={styles.formField}>
                <ThemedText style={styles.label}>Current Company (Optional)</ThemedText>
                {renderInput("briefcase", "Where do you work?", company, setCompany, {
                  autoCapitalize: "words",
                })}
              </View>
            ) : null}

            <View style={styles.formField}>
              <ThemedText style={styles.label}>Password *</ThemedText>
              {renderInput("lock", "At least 6 characters", password, setPassword, {
                autoCapitalize: "none",
                secureTextEntry: true,
              })}
            </View>

            <View style={styles.formField}>
              <ThemedText style={styles.label}>Confirm Password *</ThemedText>
              {renderInput("lock", "Confirm your password", confirmPassword, setConfirmPassword, {
                autoCapitalize: "none",
                secureTextEntry: true,
              })}
            </View>

            <Button
              onPress={handleSignup}
              disabled={isLoading}
              style={[styles.signupButton, { backgroundColor: accentColor }]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                "Create Account"
              )}
            </Button>
          </View>

          <View style={styles.footer}>
            <ThemedText style={{ color: theme.textSecondary }}>
              Already have an account?{" "}
            </ThemedText>
            <Pressable onPress={() => navigation.navigate("Login", { userType })}>
              <ThemedText style={{ color: accentColor, fontWeight: "600" }}>
                Log In
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
  signupButton: {
    marginTop: Spacing.md,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing["2xl"],
  },
});
