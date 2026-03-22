/**
 * Supabase browser/native client. Requires EXPO_PUBLIC_SUPABASE_URL and
 * EXPO_PUBLIC_SUPABASE_ANON_KEY from the project dashboard (Settings → API).
 *
 * Note: A personal access token (sbp_…) is for the CLI/Management API only — not for createClient.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

function readUrl(): string {
  return (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
}

function readAnonKey(): string {
  return (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
}

/** True when URL + anon key look configured (not placeholders). */
export function isSupabaseConfigured(): boolean {
  const url = readUrl();
  const key = readAnonKey();
  if (!url || !key) return false;
  if (url.includes("YOUR_PROJECT_REF") || url.includes("placeholder")) return false;
  if (key === "your-supabase-anon-key" || key.startsWith("sbp_")) return false;
  return true;
}

let client: SupabaseClient | null = null;

/** Shared client, or null if env is missing. */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    const url = readUrl();
    const key = readAnonKey();
    client = createClient(url, key, {
      auth: {
        storage: Platform.OS === "web" ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === "web",
      },
    });
  }
  return client;
}

/** Default table for CSV leads (override via EXPO_PUBLIC_SUPABASE_LEADS_TABLE). */
export function getSupabaseLeadsTable(): string {
  return (
    process.env.EXPO_PUBLIC_SUPABASE_LEADS_TABLE?.trim() || "roof_leads"
  );
}
