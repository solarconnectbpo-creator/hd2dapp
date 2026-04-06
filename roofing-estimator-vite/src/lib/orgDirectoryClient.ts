import { getHd2dApiBase } from "./hd2dApiBase";
import { readJsonResponseBody } from "./readJsonResponse";

export type OrgDirectoryRow = {
  id: string;
  name: string;
  org_kind: "local" | "storm" | "both";
  service_states: string[];
};

export type PlacementPref = "local" | "storm" | "either";

export async function fetchOrgDirectory(
  state: string,
  placementPref: PlacementPref,
): Promise<OrgDirectoryRow[]> {
  const base = getHd2dApiBase().replace(/\/$/, "");
  if (!base) return [];
  const params = new URLSearchParams({
    state: state.trim().toUpperCase().slice(0, 2),
    placementPref,
  });
  const res = await fetch(`${base}/api/orgs/directory?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  const data = await readJsonResponseBody<{
    success?: boolean;
    organizations?: OrgDirectoryRow[];
  }>(res);
  if (!res.ok || data.success !== true || !Array.isArray(data.organizations)) return [];
  return data.organizations;
}
