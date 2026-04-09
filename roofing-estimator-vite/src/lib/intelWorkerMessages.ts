import { HD2D_PUBLIC_API_ORIGIN } from "../config/siteOrigin";

/** Shown when `VITE_INTEL_API_BASE` is missing or invalid. */
export function intelWorkerNotConfiguredMessage(): string {
  return `Intel Worker base URL is not configured. Set VITE_INTEL_API_BASE (e.g. ${HD2D_PUBLIC_API_ORIGIN}) or run dev with the Worker proxy.`;
}

/** Shown when fetch fails (offline, DNS, CORS, etc.). */
export function intelWorkerUnreachableMessage(): string {
  return "Could not reach the HD2D API. Check your network and VITE_INTEL_API_BASE.";
}
