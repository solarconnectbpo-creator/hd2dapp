/**
 * Optional Supabase Auth helpers. The app’s primary login is still `AuthContext` + API;
 * use these when you add Supabase Auth (email/OAuth) alongside or instead of that flow.
 */
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient";

export async function getSupabaseSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;
  const c = getSupabaseClient();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session ?? null;
}

export async function signOutSupabaseAuth(): Promise<void> {
  const c = getSupabaseClient();
  if (!c) return;
  await c.auth.signOut();
}

export function onSupabaseAuthStateChange(
  cb: (event: AuthChangeEvent, session: Session | null) => void,
): { unsubscribe: () => void } {
  const c = getSupabaseClient();
  if (!c) return { unsubscribe: () => {} };
  const { data } = c.auth.onAuthStateChange(cb);
  return { unsubscribe: () => data.subscription.unsubscribe() };
}
