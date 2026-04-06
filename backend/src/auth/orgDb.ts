/** Organizations + rep placement (D1). */

type D1 = any;

function now(): number {
  return Math.floor(Date.now() / 1000);
}

export type OrgKind = "local" | "storm" | "both";
export type PlacementPref = "local" | "storm" | "either";
export type RepStatus = "pending" | "matched" | "paused";

export type OrganizationRow = {
  id: string;
  name: string;
  service_states: string;
  org_kind: OrgKind;
  created_at: number;
  updated_at: number;
};

const US_STATE_RE = /^[A-Z]{2}$/;

export function isValidUsStateCode(s: string): boolean {
  return US_STATE_RE.test(String(s || "").trim().toUpperCase());
}

export function normalizeState(s: string): string {
  return String(s || "").trim().toUpperCase().slice(0, 2);
}

export async function insertOrganization(
  db: D1,
  args: { id: string; name: string; serviceStates: string[]; orgKind: OrgKind },
): Promise<void> {
  const t = now();
  const statesJson = JSON.stringify(args.serviceStates.map((x) => normalizeState(x)).filter(isValidUsStateCode));
  await db
    .prepare(
      `INSERT INTO organizations (id, name, service_states, org_kind, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(args.id, args.name.trim(), statesJson, args.orgKind, t, t)
    .run();
}

export async function insertOrgMember(
  db: D1,
  args: { orgId: string; userId: string; role: "owner" | "admin" | "member" },
): Promise<void> {
  const t = now();
  await db
    .prepare(`INSERT INTO org_members (org_id, user_id, role, created_at) VALUES (?, ?, ?, ?)`)
    .bind(args.orgId, args.userId, args.role, t)
    .run();
}

export async function insertRepProfile(
  db: D1,
  args: { userId: string; homeState: string; placementPref: PlacementPref },
): Promise<void> {
  const t = now();
  const st = normalizeState(args.homeState);
  await db
    .prepare(
      `INSERT INTO rep_profiles (user_id, home_state, placement_pref, status, matched_org_id, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', NULL, ?, ?)`,
    )
    .bind(args.userId, st, args.placementPref, t, t)
    .run();
}

function parseStatesJson(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => normalizeState(String(x))).filter(isValidUsStateCode);
  } catch {
    return [];
  }
}

/**
 * Orgs to show a rep exploring teams: filter by home state + placement preference.
 * - local: territory includes that state (does not list pure storm-national orgs unless they also list the state).
 * - storm: storm-response / hybrid orgs (kind storm or both).
 * - either: union of both rules.
 */
export async function listOrganizationsForDirectory(
  db: D1,
  args: { state: string; placementPref: PlacementPref },
): Promise<Array<{ id: string; name: string; org_kind: OrgKind; service_states: string[] }>> {
  const st = normalizeState(args.state);
  if (!isValidUsStateCode(st)) return [];

  const rows = (await db
    .prepare(`SELECT id, name, service_states, org_kind FROM organizations ORDER BY name ASC`)
    .all()) as { results?: OrganizationRow[] };

  const out: Array<{ id: string; name: string; org_kind: OrgKind; service_states: string[] }> = [];
  for (const r of rows.results ?? []) {
    const states = parseStatesJson(r.service_states);
    const servesState = states.includes(st);
    const isStormKind = r.org_kind === "storm" || r.org_kind === "both";

    let include = false;
    if (args.placementPref === "local") {
      include = servesState;
    } else if (args.placementPref === "storm") {
      include = isStormKind;
    } else {
      include = servesState || isStormKind;
    }

    if (include) {
      out.push({
        id: r.id,
        name: r.name,
        org_kind: r.org_kind,
        service_states: states,
      });
    }
  }
  return out;
}

export async function assignRepToOrg(
  db: D1,
  args: { userId: string; orgId: string },
): Promise<boolean> {
  const t = now();
  const rep = await db
    .prepare(`SELECT user_id FROM rep_profiles WHERE user_id = ?`)
    .bind(args.userId)
    .first<{ user_id: string }>();
  if (!rep) return false;
  const org = await db.prepare(`SELECT id FROM organizations WHERE id = ?`).bind(args.orgId).first<{ id: string }>();
  if (!org) return false;

  await db.prepare(`DELETE FROM org_members WHERE user_id = ?`).bind(args.userId).run();
  await db
    .prepare(`INSERT INTO org_members (org_id, user_id, role, created_at) VALUES (?, ?, 'member', ?)`)
    .bind(args.orgId, args.userId, t)
    .run();
  await db
    .prepare(
      `UPDATE rep_profiles SET matched_org_id = ?, status = 'matched', updated_at = ? WHERE user_id = ?`,
    )
    .bind(args.orgId, t, args.userId)
    .run();
  return true;
}
