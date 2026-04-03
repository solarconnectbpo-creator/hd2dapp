import type { OrgSettings } from "./orgSettings";
import {
  fetchBatchDataPropertyByAddress,
  type BatchDataAddressCriteria,
  nominatimReverseToBatchDataCriteria,
  parseUsAddressLineForBatchData,
} from "./propertyBatchDataLookup";
import type { PropertyImportPayload } from "./propertyScraper";

export type OwnerEnrichmentSource = "base" | "stl" | "batchdata" | "fallback";

export type OwnerLookupContext = {
  payload: PropertyImportPayload;
  nominatimDisplayName?: string;
  nominatimAddress?: Record<string, string | undefined>;
  lat?: number;
  lng?: number;
};

export type OwnerLookupSuccess = {
  ok: true;
  payload: PropertyImportPayload;
  source: OwnerEnrichmentSource;
  note?: string;
};

export type OwnerLookupFailure = {
  ok: false;
  message: string;
};

export type OwnerLookupResult = OwnerLookupSuccess | OwnerLookupFailure;

function isOwnerInfoComplete(payload: PropertyImportPayload): boolean {
  const owner = payload.ownerName.trim();
  const hasContact = Boolean(
    payload.ownerPhone.trim() ||
      payload.ownerEmail.trim() ||
      payload.ownerMailingAddress.trim() ||
      payload.contactPersonPhone.trim() ||
      payload.contactPersonName.trim(),
  );
  return Boolean(owner && hasContact);
}

function mergeOwnerFields(base: PropertyImportPayload, fromApi: PropertyImportPayload): PropertyImportPayload {
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
    ownerName: pick(base.ownerName, fromApi.ownerName || fromApi.ownerPmEntityLabel || ""),
    ownerPhone: pick(base.ownerPhone, fromApi.ownerPhone || fromApi.contactPersonPhone),
    ownerEmail: pick(base.ownerEmail, fromApi.ownerEmail),
    contactPersonName: pick(base.contactPersonName, fromApi.contactPersonName),
    contactPersonPhone: pick(base.contactPersonPhone, fromApi.contactPersonPhone),
    ownerEntityType: pick(base.ownerEntityType, fromApi.ownerEntityType),
    ownerMailingAddress: pick(base.ownerMailingAddress, fromApi.ownerMailingAddress),
    ownerPmEntityLabel: pick(base.ownerPmEntityLabel ?? "", fromApi.ownerPmEntityLabel ?? "") || undefined,
    notes: [base.notes, fromApi.notes].filter(Boolean).join("\n\n"),
    source: base.source,
  };
}

/** Exported for Canvassing: try multiple parsed address lines when the first BatchData query misses. */
export function buildCriteriaCandidates(ctx: OwnerLookupContext): BatchDataAddressCriteria[] {
  const candidates: BatchDataAddressCriteria[] = [];
  const seen = new Set<string>();
  const push = (c: BatchDataAddressCriteria | null) => {
    if (!c) return;
    const key = `${c.street_address}|${c.city}|${c.state}|${c.zip_code}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(c);
  };

  push(
    nominatimReverseToBatchDataCriteria({
      display_name: ctx.nominatimDisplayName,
      address: ctx.nominatimAddress,
    }),
  );
  if (ctx.nominatimDisplayName) {
    push(parseUsAddressLineForBatchData(ctx.nominatimDisplayName));
    const trimmed = ctx.nominatimDisplayName.replace(/,?\s*United States\s*$/i, "").trim();
    if (trimmed !== ctx.nominatimDisplayName) {
      push(parseUsAddressLineForBatchData(trimmed));
    }
  }
  push(parseUsAddressLineForBatchData(ctx.payload.address));
  return candidates;
}

export async function runOwnerFallbackLookup(
  org: OrgSettings,
  batchDataApiKey: string,
  ctx: OwnerLookupContext,
): Promise<OwnerLookupResult> {
  if (isOwnerInfoComplete(ctx.payload)) {
    return { ok: true, payload: ctx.payload, source: "base" };
  }
  if (org.ownerFallbackProvider === "none") {
    return { ok: false, message: "Owner fallback provider is disabled in org settings." };
  }
  if (org.ownerFallbackProvider !== "batchdata-relaxed") {
    return { ok: false, message: `Unsupported fallback provider: ${org.ownerFallbackProvider}` };
  }

  const key = (org.ownerFallbackApiKey || batchDataApiKey || "").trim();
  if (!key) {
    return { ok: false, message: "Fallback provider needs an API key. Add BatchData or fallback key in settings." };
  }

  const candidates = buildCriteriaCandidates(ctx);
  if (!candidates.length) {
    return { ok: false, message: "Fallback provider could not build a valid address query for this property." };
  }

  let latestError = "";
  for (const criteria of candidates) {
    const res = await fetchBatchDataPropertyByAddress(key, criteria);
    if (!res.ok) {
      latestError = res.message;
      continue;
    }
    const merged = mergeOwnerFields(ctx.payload, res.payload);
    if (isOwnerInfoComplete(merged) || merged.ownerName.trim()) {
      return {
        ok: true,
        payload: merged,
        source: "fallback",
        note: "Fallback provider (BatchData relaxed) added owner/contact fields.",
      };
    }
  }

  return {
    ok: false,
    message: latestError || "Fallback provider could not find owner/contact data for this address.",
  };
}

