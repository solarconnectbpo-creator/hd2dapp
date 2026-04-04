import type { OrgSettings } from "./orgSettings";
import {
  fetchDealMachinePropertyByAddress,
  isDealMachineLikelyConfigured,
} from "./propertyDealMachineLookup";
import {
  nominatimReverseToAddressCriteria,
  parseUsAddressLineForSearch,
  type UsAddressSearchCriteria,
} from "./propertyAddressCriteria";
import type { PropertyImportPayload } from "./propertyScraper";

export type OwnerEnrichmentSource = "base" | "stl" | "dealmachine" | "fallback";

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

/** Exported for Canvassing: try multiple parsed address lines when the first DealMachine query misses. */
export function buildCriteriaCandidates(ctx: OwnerLookupContext): UsAddressSearchCriteria[] {
  const candidates: UsAddressSearchCriteria[] = [];
  const seen = new Set<string>();
  const push = (c: UsAddressSearchCriteria | null) => {
    if (!c) return;
    const key = `${c.street_address}|${c.city}|${c.state}|${c.zip_code}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(c);
  };

  push(
    nominatimReverseToAddressCriteria({
      display_name: ctx.nominatimDisplayName,
      address: ctx.nominatimAddress,
    }),
  );
  if (ctx.nominatimDisplayName) {
    push(parseUsAddressLineForSearch(ctx.nominatimDisplayName));
    const trimmed = ctx.nominatimDisplayName.replace(/,?\s*United States\s*$/i, "").trim();
    if (trimmed !== ctx.nominatimDisplayName) {
      push(parseUsAddressLineForSearch(trimmed));
    }
  }
  push(parseUsAddressLineForSearch(ctx.payload.address));
  return candidates;
}

export async function runOwnerFallbackLookup(
  org: OrgSettings,
  ctx: OwnerLookupContext,
): Promise<OwnerLookupResult> {
  if (isOwnerInfoComplete(ctx.payload)) {
    return { ok: true, payload: ctx.payload, source: "base" };
  }
  if (org.ownerFallbackProvider === "none" && org.ownerFallbackLockedOff) {
    return { ok: false, message: "Owner fallback is turned off in this browser (Contacts settings)." };
  }
  if (org.ownerFallbackProvider !== "dealmachine-relaxed" && org.ownerFallbackProvider !== "none") {
    return { ok: false, message: `Unsupported fallback provider: ${org.ownerFallbackProvider}` };
  }
  if (!isDealMachineLikelyConfigured()) {
    return {
      ok: false,
      message: "DealMachine fallback needs the HD2D Worker with DEALMACHINE_API_KEY configured (wrangler secret).",
    };
  }

  const candidates = buildCriteriaCandidates(ctx);
  if (!candidates.length) {
    return { ok: false, message: "Fallback could not build a valid address query for this property." };
  }

  let latestError = "";
  for (const criteria of candidates) {
    const res = await fetchDealMachinePropertyByAddress(criteria);
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
        note: "Owner fallback (relaxed address match) added owner/contact fields via DealMachine.",
      };
    }
  }

  return {
    ok: false,
    message: latestError || "Fallback could not find owner/contact data for this address.",
  };
}
