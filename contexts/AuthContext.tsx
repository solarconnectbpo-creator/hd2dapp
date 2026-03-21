import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { apiClient } from "@/services/api";

export type UserType = "sales_rep" | "company" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  userType: UserType;
  company?: string;
  phone?: string;
  createdAt: string;
  isAdmin?: boolean;
  companyId?: string;
}

interface AuthContextType {
  user: User | null;
  companyId: string | null;
  isLoading: boolean;
  /** Set when session restore fails (e.g. corrupt storage); cleared on successful load or login. */
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, userType: UserType) => Promise<{ requires2FA: boolean; email?: string } | null>;
  signup: (data: SignupData) => Promise<{ requires2FA: boolean; email?: string } | null>;
  loginWithToken: (token: string, user: any) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

interface SignupData {
  email: string;
  password: string;
  name: string;
  userType: UserType;
  company?: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "auth_user";
const AUTH_TOKEN_KEY = "auth_token";
const USERS_STORAGE_KEY = "registered_users";

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  } else {
    return SecureStore.getItemAsync(key);
  }
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeDemoAdmin();
    loadUser();
  }, []);

  const initializeDemoAdmin = async () => {
    try {
      const users = await getRegisteredUsers();
      const adminKey = "admin@hd2d.com_admin";
      if (!users[adminKey]) {
        users[adminKey] = {
          password: "admin123",
          user: {
            id: "admin_001",
            email: "admin@hd2d.com",
            name: "HD2D Admin",
            userType: "admin",
            isAdmin: true,
            createdAt: new Date().toISOString(),
          },
        };
        await saveRegisteredUsers(users);
      }
    } catch (error) {
      console.error("Error initializing demo admin:", error);
    }
  };

  const loadUser = async () => {
    try {
      setError(null);
      const userData = await secureGet(AUTH_STORAGE_KEY);
      const token = await secureGet(AUTH_TOKEN_KEY);
      if (userData && token) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setCompanyId(parsedUser.companyId || null);
        apiClient.setToken(token);
        apiClient.setCompanyId(parsedUser.companyId || null);
      }
    } catch (e) {
      console.error("Error loading user:", e);
      setError(e instanceof Error ? e.message : "Failed to restore session.");
    } finally {
      setIsLoading(false);
    }
  };

  const getRegisteredUsers = async (): Promise<Record<string, { password: string; user: User }>> => {
    try {
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      return usersData ? JSON.parse(usersData) : {};
    } catch {
      return {};
    }
  };

  const saveRegisteredUsers = async (users: Record<string, { password: string; user: User }>) => {
    await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  };

  const login = async (email: string, password: string, userType: UserType): Promise<{ requires2FA: boolean; email?: string } | null> => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    const roleFromEmail = (value: string): UserType =>
      value.includes("admin") ? "admin" : value.includes("company") ? "company" : "sales_rep";

    const demoCredentials: Record<string, { password: string; userType: UserType }> = {
      "test.company@hardcoredoortodoorclosers.com": { password: "TestCompany123!", userType: "company" },
      "test.rep@hardcoredoortodoorclosers.com": { password: "TestRep123!", userType: "sales_rep" },
      "admin@hardcoredoortodoorclosers.com": { password: "AdminTest123!", userType: "admin" },
      "admin@hd2d.com": { password: "admin123", userType: "admin" },
    };

    try {
      // Try API login first; only allow when requested role matches returned role.
      const result: any = await apiClient.login(normalizedEmail, normalizedPassword);
      const resolvedType = (result?.user?.user_type || roleFromEmail(normalizedEmail)) as UserType;
      if (resolvedType !== userType) return null;
      return {
        requires2FA: true,
        email: normalizedEmail,
      };
    } catch (error) {
      console.error("API login failed, trying local fallback:", error);
      
      // Fallback: check against locally registered users
      try {
        const users = await getRegisteredUsers();
        const userKey = `${normalizedEmail}_${userType}`;
        const user = users[userKey];
        
        if (user && user.password === normalizedPassword) {
          // Local user found with correct password
          return {
            requires2FA: true,
            email: normalizedEmail,
          };
        }

        // Development/demo account fallback (works if backend is temporarily down).
        const demo = demoCredentials[normalizedEmail];
        if (demo && demo.password === normalizedPassword && demo.userType === userType) {
          return {
            requires2FA: true,
            email: normalizedEmail,
          };
        }
        
        return null;
      } catch (fallbackError) {
        console.error("Local login fallback failed:", fallbackError);
        return null;
      }
    }
  };

  const signup = async (data: SignupData): Promise<{ requires2FA: boolean; email?: string } | null> => {
    try {
      await apiClient.register(data.email, data.password, data.name, data.userType, data.phone);
      return {
        requires2FA: true,
        email: data.email,
      };
    } catch (error) {
      console.error("Signup error:", error);
      return null;
    }
  };

  const loginWithToken = async (token: string, user: any) => {
    try {
      setError(null);
      await secureSet(AUTH_TOKEN_KEY, token);
      const parsedUser: User = {
        id: user.id,
        email: user.email,
        name: user.name,
        userType: user.user_type || user.userType,
        phone: user.phone,
        createdAt: new Date().toISOString(),
        isAdmin: user.user_type === "admin",
        companyId: user.companyId || user.company_id,
      };
      await secureSet(AUTH_STORAGE_KEY, JSON.stringify(parsedUser));
      apiClient.setToken(token);
      apiClient.setCompanyId(parsedUser.companyId || null);
      setUser(parsedUser);
      setCompanyId(parsedUser.companyId || null);
    } catch (error) {
      console.error("Error logging in with token:", error);
      throw error;
    }
  };

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const logout = async () => {
    try {
      setError(null);
      await secureDelete(AUTH_STORAGE_KEY);
      await secureDelete(AUTH_TOKEN_KEY);
      apiClient.setToken(null);
      apiClient.setCompanyId(null);
      setUser(null);
      setCompanyId(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        companyId,
        isLoading,
        error,
        isAuthenticated: !!user,
        login,
        signup,
        loginWithToken,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
