import type { ContactRecord } from "./contactsCsv";

export type CanvassVisitStatus = "new" | "visited" | "skip" | "interested";

export type CanvassLeadState = {
  status: CanvassVisitStatus;
  notes: string;
  updatedAt: string;
};

const LEADS_KEY = "roofing-estimator-vite-canvassing-leads-v1";
const STATES_KEY = "roofing-estimator-vite-canvassing-states-v1";

export function loadCanvassLeads(): ContactRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEADS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as ContactRecord[];
  } catch {
    return [];
  }
}

export function saveCanvassLeads(leads: ContactRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
  } catch {
    /* quota */
  }
}

export function loadCanvassStates(): Record<string, CanvassLeadState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STATES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, CanvassLeadState>;
  } catch {
    return {};
  }
}

export function saveCanvassStates(states: Record<string, CanvassLeadState>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STATES_KEY, JSON.stringify(states));
  } catch {
    /* quota */
  }
}
