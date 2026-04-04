/**
 * DealMachine Public API — address-based property + owner fields (proxied by HD2D Worker).
 * Docs: https://docs.dealmachine.com/
 *
 * Auth: only the Worker uses `DEALMACHINE_API_KEY` (wrangler secret / backend `.dev.vars`).
 * The browser never sends an API key — configure `VITE_INTEL_API_BASE` and run `wrangler dev` locally.
 */

import {
  extractNestedPropertyRecordFromJson,
  parseUsAddressLineForSearch,
  type UsAddressSearchCriteria,
} from "./propertyAddressCriteria";
import { getHd2dApiBase, isHd2dApiConfigured } from "./hd2dApiBase";
import { mapRecordToImportPayload, type PropertyImportPayload } from "./propertyScraper";

export {
  getArcgisMapServerTileConfig,
  hydrateDealMachineCapabilitiesFromHealth,
} from "./hd2dCapabilities";

/** Keep in sync with backend/src/api/dealmachineProxy.ts DEFAULT_DEALMACHINE_PROPERTY_PATH */
export const DEALMACHINE_DEFAULT_UPSTREAM_PATH = "/v1/properties/search";

function dealMachineWorkerUrl(): string {
  return `${getHd2dApiBase()}/api/dealmachine/property`;
}

function extractDealMachineErrorMessage(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const o = json as {
    error?: string;
    message?: string;
    status?: { message?: string };
  };
  return o.error || o.message || o.status?.message || null;
}

export type DealMachineSearchOk = {
  ok: true;
  payload: PropertyImportPayload;
  rawRecord: Record<string, unknown>;
};

export type DealMachineSearchErr = { ok: false; message: string };

/**
 * True when we can attempt a DealMachine HTTP request (Worker base URL configured).
 */
export function isDealMachineRequestPossible(): boolean {
  return isHd2dApiConfigured();
}

/**
 * True when the app should call the Worker DealMachine proxy. Auth is 100% server-side (`DEALMACHINE_API_KEY`);
 * we always attempt when the Worker base URL is known so Canvassing/property flows work without any in-app API key.
 * Missing keys yield a clear 401 message from the Worker instead of skipping enrichment silently.
 */
export function isDealMachineLikelyConfigured(): boolean {
  return isHd2dApiConfigured();
}

async function readJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { parseError: true, raw: text.slice(0, 500) };
  }
}

/**
 * POST address criteria to DealMachine via Worker proxy only.
 * Server-side `DEALMACHINE_API_KEY` satisfies auth; the client sends no secret.
 */
export async function fetchDealMachinePropertyByAddress(
  criteria: UsAddressSearchCriteria,
): Promise<DealMachineSearchOk | DealMachineSearchErr> {
  if (!criteria.street_address?.trim() || !criteria.city?.trim() || !criteria.state?.trim()) {
    return { ok: false, message: "Street, city, and state are required for DealMachine search." };
  }

  if (!isHd2dApiConfigured()) {
    return {
      ok: false,
      message:
        "DealMachine needs the HD2D Worker: set VITE_INTEL_API_BASE to your Worker URL and configure DEALMACHINE_API_KEY in wrangler secrets or backend .dev.vars.",
    };
  }

  const body = JSON.stringify({
    street_address: criteria.street_address.trim(),
    city: criteria.city.trim(),
    state: criteria.state.trim(),
    zip_code: (criteria.zip_code ?? "").trim(),
  });

  const url = dealMachineWorkerUrl();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers, body });
  } catch (e) {
    return {
      ok: false,
      message: `Network error calling DealMachine (${e instanceof Error ? e.message : String(e)}).`,
    };
  }

  const json = await readJsonResponse(res);
  if (!res.ok) {
    const apiMsg = extractDealMachineErrorMessage(json);
    const suffix = apiMsg ? `: ${apiMsg}` : "";
    if (res.status === 401) {
      return {
        ok: false,
        message: `DealMachine ${res.status}${suffix}. Set DEALMACHINE_API_KEY on the Worker (wrangler secret or .dev.vars).`,
      };
    }
    return { ok: false, message: `DealMachine ${res.status}${suffix}` };
  }

  const record = extractNestedPropertyRecordFromJson(json);
  if (!record) {
    return {
      ok: false,
      message:
        "DealMachine returned 200 but no property object was found. Check the raw JSON in the network tab or verify DEALMACHINE_PROPERTY_PATH matches your DealMachine API docs.",
    };
  }

  const payload = mapRecordToImportPayload(record, "dealmachine");
  if (!payload) {
    return { ok: false, message: "Could not map DealMachine record to a property row (missing address)." };
  }
  return { ok: true, payload, rawRecord: record };
}

/** Maps arbitrary DealMachine JSON to `PropertyImportPayload` (for tests and debugging). */
export function dealMachineResponseRootToPayload(root: unknown): PropertyImportPayload | null {
  const record = extractNestedPropertyRecordFromJson(root);
  if (!record) return null;
  return mapRecordToImportPayload(record, "dealmachine");
}

/** Merge API-derived fields into an existing row; keeps non-empty manual/CSV values. */
export function mergeDealMachineIntoPropertyRow(
  base: PropertyImportPayload,
  fromApi: PropertyImportPayload,
): PropertyImportPayload {
  const pick = (a: string, b: string) => (a.trim() ? a : b);
  return {
    ...base,
    address: pick(base.address, fromApi.address),
    stateCode: pick(base.stateCode, fromApi.stateCode),
    latitude: pick(base.latitude, fromApi.latitude),
    longitude: pick(base.longitude, fromApi.longitude),
    areaSqFt: pick(base.areaSqFt, fromApi.areaSqFt),
    yearBuilt: pick(base.yearBuilt, fromApi.yearBuilt),
    lotSizeSqFt: pick(base.lotSizeSqFt, fromApi.lotSizeSqFt),
    propertyType: base.propertyType !== "other" ? base.propertyType : fromApi.propertyType,
    ownerName: pick(base.ownerName, fromApi.ownerName),
    ownerPhone: pick(base.ownerPhone, fromApi.ownerPhone),
    ownerEmail: pick(base.ownerEmail, fromApi.ownerEmail),
    contactPersonName: pick(base.contactPersonName, fromApi.contactPersonName),
    contactPersonPhone: pick(base.contactPersonPhone, fromApi.contactPersonPhone),
    ownerEntityType: pick(base.ownerEntityType, fromApi.ownerEntityType),
    ownerMailingAddress: pick(base.ownerMailingAddress, fromApi.ownerMailingAddress),
    ownerPmEntityLabel: pick(base.ownerPmEntityLabel ?? "", fromApi.ownerPmEntityLabel ?? "") || undefined,
    notes: [base.notes, fromApi.notes].filter(Boolean).join("\n"),
    source: base.source,
  };
}

export type DealMachineBulkOptions = {
  limit: number;
  delayMs: number;
  skipIfOwnerPresent: boolean;
};

export async function enrichPropertyRecordsWithDealMachine(
  rows: PropertyImportPayload[],
  opts: DealMachineBulkOptions,
): Promise<{ results: PropertyImportPayload[]; filled: number; skipped: number; failed: number }> {
  const results = [...rows];
  let filled = 0;
  let skipped = 0;
  let failed = 0;
  let calls = 0;

  for (let i = 0; i < results.length; i++) {
    if (calls >= opts.limit) break;
    const row = results[i]!;
    if (opts.skipIfOwnerPresent && row.ownerName.trim()) {
      skipped++;
      continue;
    }
    const criteria = parseUsAddressLineForSearch(row.address);
    if (!criteria) {
      skipped++;
      continue;
    }

    const r = await fetchDealMachinePropertyByAddress(criteria);
    calls++;
    if (!r.ok) {
      failed++;
      results[i] = {
        ...row,
        notes: row.notes + (row.notes ? "\n" : "") + `DealMachine error: ${r.message}`,
      };
    } else {
      filled++;
      results[i] = mergeDealMachineIntoPropertyRow(row, r.payload);
    }

    if (calls < opts.limit && i < results.length - 1 && opts.delayMs > 0) {
      await new Promise((res) => setTimeout(res, opts.delayMs));
    }
  }

  return { results, filled, skipped, failed };
}
