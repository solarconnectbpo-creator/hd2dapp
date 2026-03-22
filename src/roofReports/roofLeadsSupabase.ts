import type { PropertySelection } from "./roofReportTypes";
import {
  getSupabaseClient,
  getSupabaseLeadsTable,
  isSupabaseConfigured,
} from "@/src/lib/supabaseClient";

/** Stable row key for upserts (matches SQL migration `client_lead_id`). */
export function getLeadClientId(lead: PropertySelection): string {
  if (lead.id?.trim()) return lead.id.trim();
  const a = lead.address.trim().toLowerCase();
  return `${lead.lat.toFixed(6)}|${lead.lng.toFixed(6)}|${a}`;
}

function parseIso(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

/** Merge two lists by client id; keep the row with newer `clickedAtIso`. */
function mergeByClientId(
  a: PropertySelection[],
  b: PropertySelection[],
): PropertySelection[] {
  const map = new Map<string, PropertySelection>();
  for (const lead of a) {
    map.set(getLeadClientId(lead), lead);
  }
  for (const lead of b) {
    const id = getLeadClientId(lead);
    const prev = map.get(id);
    if (!prev) {
      map.set(id, lead);
      continue;
    }
    if (parseIso(lead.clickedAtIso) >= parseIso(prev.clickedAtIso)) {
      map.set(id, lead);
    }
  }
  return Array.from(map.values());
}

/** Push all leads to Supabase (upsert by `client_lead_id`). */
export async function pushRoofLeadsToSupabase(
  leads: PropertySelection[],
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const table = getSupabaseLeadsTable();
  const rows = leads.map((payload) => ({
    client_lead_id: getLeadClientId(payload),
    payload,
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from(table).upsert(rows, {
    onConflict: "client_lead_id",
  });
  if (error) throw error;
}

/**
 * Fetch cloud leads and merge with local (newer `clickedAtIso` wins per id).
 * On error, returns `local` unchanged.
 */
export async function mergeLeadsFromSupabase(
  local: PropertySelection[],
): Promise<PropertySelection[]> {
  if (!isSupabaseConfigured()) return local;
  const supabase = getSupabaseClient();
  if (!supabase) return local;
  const table = getSupabaseLeadsTable();
  const { data, error } = await supabase.from(table).select("payload");
  if (error) {
    console.warn("[roofLeads] Supabase fetch failed:", error.message);
    return local;
  }
  const rows = (data ?? []) as { payload: PropertySelection }[];
  const remote = rows.map((r) => r.payload).filter(Boolean);
  return mergeByClientId(local, remote);
}
