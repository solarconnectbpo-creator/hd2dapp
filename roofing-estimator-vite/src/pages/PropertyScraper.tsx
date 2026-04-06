import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Building2,
  ClipboardPaste,
  ExternalLink,
  FileDown,
  KeyRound,
  Landmark,
  Loader2,
  Phone,
  Sparkles,
  Upload,
  UserSearch,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";
import { VirtualizedPropertyLeadTable } from "../components/VirtualizedPropertyLeadTable";
import { parsePropertyContactsCsvAsync } from "../lib/propertyContactsCsv";
import {
  extractUsPhonesFromText,
  mergeOwnerNameFromManualResearch,
  mergePhonesFromManualResearch,
} from "../lib/propertyClipboardContactMerge";
import {
  FAST_PEOPLE_SEARCH_HOME_LANG_EN,
  googleSiteSearchFastPeopleUrl,
  primaryOwnerName,
} from "../lib/propertyFastPeopleSearchLinks";
import {
  enrichPropertyRecordWithPlaces,
  enrichPropertyRecordsWithPlaces,
  extractCityFromPropertyAddress,
  getGooglePlacesKeyStorageKey,
} from "../lib/propertyPhoneEnrichment";
import {
  enrichPropertyRecordWithPdl,
  enrichPropertyRecordsWithPdl,
  getPdlKeyStorageKey,
} from "../lib/propertyPdlEnrichment";
import {
  buildPropertyCampaignCsv,
  downloadCsvFile,
  FREE_PUBLIC_RECORDS_CSV_TEMPLATE,
} from "../lib/propertyCampaignExport";
import { rankCommercialPropertyLeads } from "../lib/propertyCommercialLeadRank";
import { parseUsAddressLineForSearch } from "../lib/propertyAddressCriteria";
import {
  enrichPropertyRecordsWithDealMachine,
  fetchDealMachinePropertyByAddress,
  isDealMachineLikelyConfigured,
  mergeDealMachineIntoPropertyRow,
} from "../lib/propertyDealMachineLookup";
import { parsePropertyJsonPaste, stashPendingPropertyImport, type PropertyImportPayload } from "../lib/propertyScraper";

function reindexPreviewAfterRank(
  ranked: PropertyImportPayload[],
  trackAddress: string | undefined,
): { nextIndex: number | null; nextPreview: PropertyImportPayload | null } {
  if (!trackAddress) return { nextIndex: null, nextPreview: null };
  const idx = ranked.findIndex((r) => r.address === trackAddress);
  if (idx < 0) return { nextIndex: null, nextPreview: null };
  return { nextIndex: idx, nextPreview: ranked[idx]! };
}

/** Internal merge tag only — not shown in the UI. */
const MANUAL_LOOKUP_SOURCE = "manual";

/** Browser read + string size guard for huge CSVs (memory is still ~file size + parsed rows). */
const MAX_PROPERTY_CSV_BYTES = 180 * 1024 * 1024;

export function PropertyScraper() {
  const { user } = useAuth();
  const isAdmin = user?.user_type === "admin";
  const showVendorEnrichment = isAdmin && import.meta.env.VITE_PROPERTY_SCRAPER_OFFLINE !== "true";
  const propertyScraperOffline = import.meta.env.VITE_PROPERTY_SCRAPER_OFFLINE === "true";
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [jsonPaste, setJsonPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [preview, setPreview] = useState<PropertyImportPayload | null>(null);

  const [commResults, setCommResults] = useState<PropertyImportPayload[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [csvParseProgress, setCsvParseProgress] = useState<{
    phase: "parsing" | "ranking";
    rows: number;
  } | null>(null);

  const [placesKey, setPlacesKey] = useState("");
  const [enrichBusy, setEnrichBusy] = useState(false);
  const [enrichLimit, setEnrichLimit] = useState(25);
  const [enrichBusinessOnly, setEnrichBusinessOnly] = useState(true);

  const [pdlKey, setPdlKey] = useState("");
  const [pdlEnrichBusy, setPdlEnrichBusy] = useState(false);
  const [pdlEnrichLimit, setPdlEnrichLimit] = useState(15);
  const [pdlCompanyRows, setPdlCompanyRows] = useState(true);
  const [pdlIncludeIndividuals, setPdlIncludeIndividuals] = useState(false);

  const [dealmachineBusy, setDealmachineBusy] = useState(false);
  const [dealmachineAddressLine, setDealmachineAddressLine] = useState("");
  const [dealmachineLimit, setDealmachineLimit] = useState(15);
  const [dealmachineDelayMs, setDealmachineDelayMs] = useState(350);
  const [dealmachineSkipIfOwner, setDealmachineSkipIfOwner] = useState(false);

  /** Typed after manual people search (pasted name optional; phones via clipboard). */
  const [manualFpsOwnerName, setManualFpsOwnerName] = useState("");

  useEffect(() => {
    try {
      const k = getGooglePlacesKeyStorageKey();
      const saved = k ? window.localStorage.getItem(k) : null;
      const fromEnv = import.meta.env.VITE_GOOGLE_PLACES_API_KEY?.trim();
      if (saved) setPlacesKey(saved);
      else if (fromEnv) setPlacesKey(fromEnv);
      else setPlacesKey("");
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  useEffect(() => {
    try {
      const k = getPdlKeyStorageKey();
      const saved = k ? window.localStorage.getItem(k) : null;
      const fromEnv = import.meta.env.VITE_PDL_API_KEY?.trim();
      if (saved) setPdlKey(saved);
      else if (fromEnv) setPdlKey(fromEnv);
      else setPdlKey("");
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedRowIndex != null) {
      const a = commResults[selectedRowIndex]?.address?.trim();
      if (a) setDealmachineAddressLine(a);
      return;
    }
    if (!commResults.length && preview?.address?.trim()) {
      setDealmachineAddressLine(preview.address.trim());
    }
  }, [selectedRowIndex, commResults, preview]);

  const persistPlacesKey = useCallback(() => {
    try {
      const k = getGooglePlacesKeyStorageKey();
      if (!k) {
        setMessage({ kind: "err", text: "Sign in to save your phone lookup key." });
        return;
      }
      window.localStorage.setItem(k, placesKey.trim());
      setMessage({ kind: "ok", text: "Phone lookup API key saved in this browser." });
    } catch {
      setMessage({ kind: "err", text: "Could not save phone lookup key." });
    }
  }, [placesKey]);

  const persistPdlKey = useCallback(() => {
    try {
      const k = getPdlKeyStorageKey();
      if (!k) {
        setMessage({ kind: "err", text: "Sign in to save your contact enrichment key." });
        return;
      }
      window.localStorage.setItem(k, pdlKey.trim());
      setMessage({ kind: "ok", text: "Contact enrichment API key saved in this browser." });
    } catch {
      setMessage({ kind: "err", text: "Could not save contact enrichment key." });
    }
  }, [pdlKey]);

  const onFetchDealMachineSingle = useCallback(async () => {
    const line = dealmachineAddressLine.trim() || preview?.address?.trim() || "";
    if (!line) {
      setMessage({ kind: "err", text: "Enter a full US address (e.g. 123 Main St, City, ST 12345) or select a table row." });
      return;
    }
    const criteria = parseUsAddressLineForSearch(line);
    if (!criteria) {
      setMessage({
        kind: "err",
        text: 'Could not parse address. Use commas: "Street, City, ST" or "Street, City, ST ZIP".',
      });
      return;
    }
    setDealmachineBusy(true);
    setMessage(null);
    try {
      const r = await fetchDealMachinePropertyByAddress(criteria);
      if (!r.ok) {
        setMessage({ kind: "err", text: r.message });
        return;
      }
      const rankedOne = rankCommercialPropertyLeads([r.payload])[0] ?? r.payload;
      if (!commResults.length) {
        setPreview(rankedOne);
        setSelectedRowIndex(null);
        setMessage({
          kind: "ok",
          text: "Loaded property row from lookup. Open in measurement or export when ready.",
        });
        return;
      }
      const trackAddr = preview?.address ?? line;
      const mapped = commResults.map((row, i) => {
        if (selectedRowIndex === i) return mergeDealMachineIntoPropertyRow(row, rankedOne);
        if (row.address === line || row.address === rankedOne.address) {
          return mergeDealMachineIntoPropertyRow(row, rankedOne);
        }
        return row;
      });
      const ranked = rankCommercialPropertyLeads(mapped);
      setCommResults(ranked);
      const { nextIndex, nextPreview } = reindexPreviewAfterRank(ranked, trackAddr);
      setSelectedRowIndex(nextIndex);
      setPreview(nextPreview ?? rankedOne);
      setMessage({
        kind: "ok",
        text: "Merged lookup fields into the selected / matching row (empty fields only).",
      });
    } finally {
      setDealmachineBusy(false);
    }
  }, [dealmachineAddressLine, commResults, preview, selectedRowIndex]);

  const onFetchDealMachineBulk = useCallback(async () => {
    if (!commResults.length) {
      setMessage({ kind: "err", text: "Import a CSV first, or use single-address fetch above." });
      return;
    }
    setDealmachineBusy(true);
    setMessage(null);
    try {
      const trackAddr =
        preview?.address ?? (selectedRowIndex != null ? commResults[selectedRowIndex]?.address : undefined);
      const { results, filled, skipped, failed } = await enrichPropertyRecordsWithDealMachine(commResults, {
        limit: dealmachineLimit,
        delayMs: dealmachineDelayMs,
        skipIfOwnerPresent: dealmachineSkipIfOwner,
      });
      const ranked = rankCommercialPropertyLeads(results);
      setCommResults(ranked);
      const { nextIndex, nextPreview } = reindexPreviewAfterRank(ranked, trackAddr);
      setSelectedRowIndex(nextIndex);
      if (nextPreview) setPreview(nextPreview);
      else if (preview) {
        const n = ranked.find((r) => r.address === preview.address);
        if (n) setPreview(n);
      }
      setMessage({
        kind: "ok",
        text: `Lookup: filled ${filled} row(s); skipped ${skipped}; errors ${failed}. Max ${dealmachineLimit} API calls this run.`,
      });
    } finally {
      setDealmachineBusy(false);
    }
  }, [dealmachineDelayMs, dealmachineLimit, dealmachineSkipIfOwner, commResults, preview, selectedRowIndex]);

  const onEnrichBulk = useCallback(async () => {
    if (!commResults.length) {
      setMessage({ kind: "err", text: "Load rows first (CSV or enriched CSV)." });
      return;
    }
    setEnrichBusy(true);
    setMessage(null);
    try {
      const { results, filled, skipped, failed } = await enrichPropertyRecordsWithPlaces(commResults, placesKey, {
        limit: enrichLimit,
        businessLikeOnly: enrichBusinessOnly,
        skipIfPhonePresent: true,
        delayMs: 300,
      });
      const trackAddr =
        preview?.address ?? (selectedRowIndex != null ? commResults[selectedRowIndex]?.address : undefined);
      const ranked = rankCommercialPropertyLeads(results);
      setCommResults(ranked);
      const { nextIndex, nextPreview } = reindexPreviewAfterRank(ranked, trackAddr);
      setSelectedRowIndex(nextIndex);
      if (nextPreview) setPreview(nextPreview);
      else if (!trackAddr && preview) {
        const next = ranked.find((r) => r.address === preview.address);
        if (next) setPreview(next);
      }
      setMessage({
        kind: "ok",
        text: `Phone lookup: filled phone on ${filled} row(s); skipped ${skipped}; no phone for ${failed} attempt(s). Max ${enrichLimit} calls per run.`,
      });
    } finally {
      setEnrichBusy(false);
    }
  }, [commResults, enrichBusinessOnly, enrichLimit, placesKey, preview, selectedRowIndex]);

  const onEnrichPreview = useCallback(async () => {
    if (!preview) return;
    const prevPhone = preview.ownerPhone;
    setEnrichBusy(true);
    setMessage(null);
    try {
      const trackAddr = preview.address;
      const next = await enrichPropertyRecordWithPlaces(preview, placesKey, {
        businessLikeOnly: enrichBusinessOnly,
        skipIfPhonePresent: false,
      });
      const mapped = commResults.map((r, i) =>
        selectedRowIndex === i ? next : r.address === next.address ? next : r,
      );
      const ranked = rankCommercialPropertyLeads(mapped);
      setCommResults(ranked);
      const { nextIndex, nextPreview } = reindexPreviewAfterRank(ranked, trackAddr);
      setSelectedRowIndex(nextIndex);
      setPreview(nextPreview ?? next);
      setMessage({
        kind: "ok",
        text:
          next.ownerPhone !== prevPhone
            ? "Updated phone from lookup (see Phones and notes)."
            : "No new phone returned for this owner/location.",
      });
    } finally {
      setEnrichBusy(false);
    }
  }, [commResults, enrichBusinessOnly, placesKey, preview, selectedRowIndex]);

  const onEnrichBulkPdl = useCallback(async () => {
    if (!commResults.length) {
      setMessage({ kind: "err", text: "Load rows first." });
      return;
    }
    if (!pdlCompanyRows && !pdlIncludeIndividuals) {
      setMessage({ kind: "err", text: "Enable organization rows and/or individual owners for contact enrichment." });
      return;
    }
    setPdlEnrichBusy(true);
    setMessage(null);
    try {
      const { results, filled, skipped, failed } = await enrichPropertyRecordsWithPdl(commResults, pdlKey, {
        limit: pdlEnrichLimit,
        companyRows: pdlCompanyRows,
        includeIndividuals: pdlIncludeIndividuals,
        skipIfPhonePresent: true,
        delayMs: 400,
      });
      const trackAddr =
        preview?.address ?? (selectedRowIndex != null ? commResults[selectedRowIndex]?.address : undefined);
      const ranked = rankCommercialPropertyLeads(results);
      setCommResults(ranked);
      const { nextIndex, nextPreview } = reindexPreviewAfterRank(ranked, trackAddr);
      setSelectedRowIndex(nextIndex);
      if (nextPreview) setPreview(nextPreview);
      else if (!trackAddr && preview) {
        const next = ranked.find((r) => r.address === preview.address);
        if (next) setPreview(next);
      }
      setMessage({
        kind: "ok",
        text: `Contact enrichment: updated ${filled} row(s); skipped ${skipped}; no match / error on ${failed} attempt(s). Max ${pdlEnrichLimit} calls per run.`,
      });
    } finally {
      setPdlEnrichBusy(false);
    }
  }, [commResults, pdlCompanyRows, pdlEnrichLimit, pdlIncludeIndividuals, pdlKey, preview, selectedRowIndex]);

  const onEnrichPreviewPdl = useCallback(async () => {
    if (!preview) return;
    if (!pdlCompanyRows && !pdlIncludeIndividuals) {
      setMessage({ kind: "err", text: "Enable organization and/or individual contact enrichment." });
      return;
    }
    const prevPhone = preview.ownerPhone;
    const prevContactPhone = preview.contactPersonPhone;
    setPdlEnrichBusy(true);
    setMessage(null);
    try {
      const trackAddr = preview.address;
      const prevNotes = preview.notes;
      const next = await enrichPropertyRecordWithPdl(preview, pdlKey, {
        companyRows: pdlCompanyRows,
        includeIndividuals: pdlIncludeIndividuals,
        skipIfPhonePresent: false,
      });
      const mapped = commResults.map((r, i) =>
        selectedRowIndex === i ? next : r.address === next.address ? next : r,
      );
      const ranked = rankCommercialPropertyLeads(mapped);
      setCommResults(ranked);
      const { nextIndex, nextPreview } = reindexPreviewAfterRank(ranked, trackAddr);
      setSelectedRowIndex(nextIndex);
      setPreview(nextPreview ?? next);
      const notesChanged = next.notes !== prevNotes;
      setMessage({
        kind: "ok",
        text:
          next.ownerPhone !== prevPhone ||
          next.contactPersonPhone !== prevContactPhone ||
          next.contactPersonName !== preview.contactPersonName
            ? "Updated contact fields from enrichment (see Phones, contact person, Email, notes)."
            : notesChanged
              ? "Extra details in notes (match may lack phone — check notes)."
              : "Enrichment did not add new contact fields for this row.",
      });
    } finally {
      setPdlEnrichBusy(false);
    }
  }, [commResults, pdlCompanyRows, pdlIncludeIndividuals, pdlKey, preview, selectedRowIndex]);

  const onLoadMoOpenDataSample = useCallback(() => {
    void (async () => {
      setBusy(true);
      setMessage(null);
      setCsvParseProgress(null);
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}mo-parcels-open-data-sample.csv`);
        if (!res.ok) {
          setMessage({
            kind: "err",
            text: "Sample file not found. Run npm run data:mo-parcels:sample from the project root, then refresh.",
          });
          return;
        }
        const text = await res.text();
        setCsvParseProgress({ phase: "parsing", rows: 0 });
        const r = await parsePropertyContactsCsvAsync(text, { yieldEvery: 0 });
        if (!r.ok) {
          setMessage({ kind: "err", text: r.message });
          setCommResults([]);
          setPreview(null);
          setSelectedRowIndex(null);
          return;
        }
        setCsvParseProgress({ phase: "ranking", rows: r.rows.length });
        await new Promise<void>((res2) => window.setTimeout(res2, 0));
        const ranked = rankCommercialPropertyLeads(r.rows);
        setCommResults(ranked);
        setPreview(null);
        setSelectedRowIndex(null);
        setMessage({
          kind: "ok",
          text: "Loaded 200-row Missouri open-data sample. For the full file, run npm run data:mo-parcels and import the generated CSV.",
        });
      } catch (err) {
        setMessage({
          kind: "err",
          text: err instanceof Error ? err.message : "Could not load sample CSV.",
        });
      } finally {
        setBusy(false);
        setCsvParseProgress(null);
      }
    })();
  }, []);

  const onCsvFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_PROPERTY_CSV_BYTES) {
      setMessage({
        kind: "err",
        text: `CSV is larger than ${Math.round(MAX_PROPERTY_CSV_BYTES / 1024 / 1024)}MB. Split into multiple files or trim columns, then import each part.`,
      });
      return;
    }
    setBusy(true);
    setMessage(null);
    setCsvParseProgress(null);
    const reader = new FileReader();
    reader.onload = () => {
      void (async () => {
        try {
          const text = String(reader.result ?? "");
          let lastShown = 0;
          const r = await parsePropertyContactsCsvAsync(text, {
            yieldEvery: 2500,
            onProgress: (n) => {
              if (n - lastShown >= 4000 || n < 120) {
                lastShown = n;
                setCsvParseProgress({ phase: "parsing", rows: n });
              }
            },
          });
          if (!r.ok) {
            setMessage({ kind: "err", text: r.message });
            setCommResults([]);
            setPreview(null);
            setSelectedRowIndex(null);
            return;
          }
          setCsvParseProgress({ phase: "ranking", rows: r.rows.length });
          await new Promise<void>((res) => window.setTimeout(res, 0));
          const ranked = rankCommercialPropertyLeads(r.rows);
          setCommResults(ranked);
          setPreview(null);
          setSelectedRowIndex(null);
          const n = ranked.length.toLocaleString();
          setMessage({
            kind: "ok",
            text: `Imported ${n} row(s) from ${file.name}; ranked by commercial lead score. Table uses virtual scrolling for large lists. Use optional enrichment after import as needed.`,
          });
        } catch (err) {
          setMessage({
            kind: "err",
            text: err instanceof Error ? err.message : "Could not import CSV.",
          });
          setCommResults([]);
          setPreview(null);
          setSelectedRowIndex(null);
        } finally {
          setBusy(false);
          setCsvParseProgress(null);
        }
      })();
    };
    reader.onerror = () => {
      setBusy(false);
      setCsvParseProgress(null);
      setMessage({ kind: "err", text: "Could not read the CSV file." });
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const onParseJson = useCallback(() => {
    setMessage(null);
    const p = parsePropertyJsonPaste(jsonPaste);
    if (!p) {
      setPreview(null);
      setMessage({
        kind: "err",
        text: "Could not parse JSON or find an address. Paste a single object or array from an export / devtools.",
      });
      return;
    }
    setCommResults([]);
    setPreview(rankCommercialPropertyLeads([p])[0] ?? p);
    setSelectedRowIndex(null);
    setMessage({ kind: "ok", text: "Parsed JSON. Add optional enrichment if you have keys, then open in measurement." });
  }, [jsonPaste]);

  const sendToMeasurement = useCallback(() => {
    if (!preview) return;
    stashPendingPropertyImport(preview, { autoEstimate: true, importFootprint: true });
    navigate("/measurement/new?auto=1");
  }, [navigate, preview]);

  const onDownloadCampaignCsv = useCallback(() => {
    const rows = commResults.length > 0 ? commResults : preview ? [preview] : [];
    if (!rows.length) {
      setMessage({
        kind: "err",
        text: "Nothing to export. Import a CSV (or enriched CSV) or load a property preview first.",
      });
      return;
    }
    setMessage(null);
    const stamp = new Date().toISOString().slice(0, 10);
    try {
      const csv = buildPropertyCampaignCsv(rows);
      downloadCsvFile(`property-outreach-${stamp}.csv`, csv);
      const hint = rows.length > 25_000 ? " Very large export — if the browser tab hesitates, wait for the download." : "";
      setMessage({
        kind: "ok",
        text: `Downloaded outreach CSV (${rows.length.toLocaleString()} row${rows.length === 1 ? "" : "s"}).${hint}`,
      });
    } catch (err) {
      setMessage({
        kind: "err",
        text: err instanceof Error ? err.message : "Could not build CSV export (list may be too large for memory).",
      });
    }
  }, [commResults, preview]);

  const onDownloadFreeRecordsTemplate = useCallback(() => {
    downloadCsvFile("free-public-records-template.csv", FREE_PUBLIC_RECORDS_CSV_TEMPLATE);
    setMessage({
      kind: "ok",
      text: "Downloaded blank template for manual assessor / Secretary of State research.",
    });
  }, []);

  const applyMergedPreviewToTable = useCallback(
    (merged: PropertyImportPayload) => {
      if (!commResults.length) {
        setPreview(merged);
        return;
      }
      const mapped = commResults.map((r, i) => {
        if (selectedRowIndex != null && i === selectedRowIndex) return merged;
        if (r.address === merged.address) return merged;
        return r;
      });
      const ranked = rankCommercialPropertyLeads(mapped);
      const idx = ranked.findIndex((r) => r.address === merged.address);
      setCommResults(ranked);
      setSelectedRowIndex(idx >= 0 ? idx : null);
      setPreview(idx >= 0 ? ranked[idx]! : merged);
    },
    [commResults, selectedRowIndex],
  );

  const onMergeClipboardPhonesFps = useCallback(async () => {
    if (!preview) {
      setMessage({ kind: "err", text: "Select a row or load a preview first." });
      return;
    }
    setMessage(null);
    try {
      const text = await navigator.clipboard.readText();
      const phones = extractUsPhonesFromText(text);
      if (!phones.length) {
        setMessage({
          kind: "err",
          text: "No US phone numbers in clipboard. On the people-search site, select and copy the block of text that includes numbers, then try again.",
        });
        return;
      }
      const merged = mergePhonesFromManualResearch(preview, phones, MANUAL_LOOKUP_SOURCE);
      applyMergedPreviewToTable(merged);
      setMessage({
        kind: "ok",
        text: `Merged ${phones.length} phone number(s) into contact person phone. Main lines stay in Phone(s).`,
      });
    } catch {
      setMessage({
        kind: "err",
        text: "Could not read clipboard. Allow clipboard permission for this site, or paste into a note and copy again.",
      });
    }
  }, [applyMergedPreviewToTable, preview]);

  const onApplyManualOwnerNameFps = useCallback(() => {
    if (!preview) {
      setMessage({ kind: "err", text: "Select a row or load a preview first." });
      return;
    }
    const n = manualFpsOwnerName.trim();
    if (!n) {
      setMessage({
        kind: "err",
        text: "Type the owner or contact name from your lookup, then click Add name.",
      });
      return;
    }
    setMessage(null);
    const merged = mergeOwnerNameFromManualResearch(preview, n, MANUAL_LOOKUP_SOURCE);
    applyMergedPreviewToTable(merged);
    setManualFpsOwnerName("");
    setMessage({
      kind: "ok",
      text: "Contact person name saved (owner of record on deed unchanged).",
    });
  }, [applyMergedPreviewToTable, manualFpsOwnerName, preview]);

  return (
    <div className="hd2d-page-shell max-w-5xl text-[var(--x-text)]">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-semibold text-[var(--x-text)] sm:text-3xl">Property records</h1>
        <p className="max-w-3xl text-[var(--x-muted)]">
          <strong className="text-[var(--x-text)]">Open parcel data does not include owner phone numbers.</strong> The app cannot invent 50,000 accurate
          phones or contacts — that requires a <strong className="text-[var(--x-text)]">file you are licensed to use</strong> (CRM export, dialer list, data
          vendor, etc.) with <code className="text-xs bg-gray-100 px-1 rounded text-[var(--x-text)]">phone</code>,{" "}
          <code className="text-xs bg-gray-100 px-1 rounded text-[var(--x-text)]">contact_person_name</code>, and{" "}
          <code className="text-xs bg-gray-100 px-1 rounded text-[var(--x-text)]">email</code> columns, or slow manual / SOS research per row.
        </p>
        <p className="max-w-3xl mt-3 text-[var(--x-muted)]">
          Import a <strong>CSV</strong> with property address, owner / entity name, mailing address, and any phones you
          already have. For bulk web-sourced fields (where allowed), use your editor&apos;s bulk-enrichment workflow and{" "}
          <strong>re-upload</strong> the enriched file.
          {isAdmin && !propertyScraperOffline ? (
            <> Optional in-browser API-assisted enrichment is available when you add keys (localhost dev proxy).</>
          ) : propertyScraperOffline ? (
            <>
              {" "}
              API enrichment panels are off (
              <code className="text-xs bg-gray-100 px-1 rounded text-[var(--x-text)]">VITE_PROPERTY_SCRAPER_OFFLINE=true</code>).
            </>
          ) : (
            <> Administrator accounts can enable optional API-assisted enrichment after CSV import.</>
          )}{" "}
          <a href={FAST_PEOPLE_SEARCH_HOME_LANG_EN} className="text-[var(--x-accent)] underline hover:opacity-90" target="_blank" rel="noreferrer">
            People search
          </a>{" "}
          (manual): open links from the preview row, then <strong>merge phones from clipboard</strong> per row.
        </p>
      </div>

      {csvParseProgress ? (
        <div className="mb-4 rounded-lg border border-blue-500/35 bg-blue-950/40 px-4 py-2 text-sm text-[var(--x-text)]">
          {csvParseProgress.phase === "parsing"
            ? `Parsing CSV… ${csvParseProgress.rows.toLocaleString()} rows converted so far (large files may take a minute).`
            : `Ranking ${csvParseProgress.rows.toLocaleString()} rows by commercial lead score…`}
        </div>
      ) : null}

      {message ? (
        <div
          className={
            message.kind === "err"
              ? "mb-4 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-2 text-sm text-[var(--x-text)]"
              : "mb-4 rounded-lg border border-emerald-500/35 bg-emerald-950/35 px-4 py-2 text-sm text-[var(--x-text)]"
          }
        >
          {message.text}
        </div>
      ) : null}

      <div className="space-y-6">
        <Card className="border-emerald-500/30 bg-emerald-950/25 text-[var(--x-text)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="w-5 h-5" />
              County assessor &amp; free public records
            </CardTitle>
            <CardDescription className="text-[var(--x-muted)]">
              No API keys required. Use your county <strong className="text-[var(--x-text)]">assessor</strong> (or cadastral) site for owner, mailing address,
              parcel, and building use; use state <strong className="text-[var(--x-text)]">Secretary of State</strong> (or business registry) for registered
              agent and entity address. Download <strong className="text-[var(--x-text)]">Blank template (manual research)</strong> under Upload CSV, fill
              columns, then re-import. Extra columns (registered agent, brokerage) map into notes automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {isAdmin ? (
              <>
                <p className="font-medium">Optional bulk web enrichment</p>
                <p className="text-[var(--x-muted)]">
                  After you <strong>Export outreach CSV</strong>, you can run bulk enrichment from your editor using your
                  team&apos;s tooling. Comply with each provider&apos;s terms and each website&apos;s rules.
                </p>
              </>
            ) : null}
          </CardContent>
        </Card>

        {showVendorEnrichment ? (
          <>
          <Card className="border-blue-500/30 bg-blue-950/25 text-[var(--x-text)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                API keys &amp; data enhancement
              </CardTitle>
              <CardDescription className="text-[var(--x-muted)]">
                Optional in-browser enrichers after CSV import. Keys stay in this browser (localStorage) or{" "}
                <code className="text-xs rounded bg-[#1a1d26] px-1 text-[var(--x-text)]">.env.local</code>. Set phone and contact API keys per your
                env file; address lookup uses the Worker&apos;s property-record secret. For manual people search, use the
                preview links — new tabs only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
              <label className="text-sm block">
                <span className="mb-1 block font-medium">Phone lookup (maps API key)</span>
                <input
                  type="password"
                  autoComplete="off"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={placesKey}
                  onChange={(e) => setPlacesKey(e.target.value)}
                  placeholder="API key"
                />
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={persistPlacesKey}>
                  Save
                </Button>
              </label>
              <label className="text-sm block">
                <span className="mb-1 block font-medium">Contact enrichment API key</span>
                <input
                  type="password"
                  autoComplete="off"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={pdlKey}
                  onChange={(e) => setPdlKey(e.target.value)}
                  placeholder="X-Api-Key"
                />
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={persistPdlKey}>
                  Save
                </Button>
              </label>
            </div>
            <div className="border-t border-white/[0.08] pt-4 space-y-3">
              <p className="text-sm font-medium">Contact enrichment options (bulk + preview)</p>
              <div className="flex flex-wrap gap-4 items-center text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pdlCompanyRows}
                    onChange={(e) => setPdlCompanyRows(e.target.checked)}
                  />
                  Organization / LLC rows
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pdlIncludeIndividuals}
                    onChange={(e) => setPdlIncludeIndividuals(e.target.checked)}
                  />
                  Individual owners
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enrichBusinessOnly}
                    onChange={(e) => setEnrichBusinessOnly(e.target.checked)}
                  />
                  Phone lookup: LLC / org-style names only
                </label>
                <label className="flex items-center gap-2">
                  <span>Phone lookup max/run</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    value={enrichLimit}
                    onChange={(e) => setEnrichLimit(Number.parseInt(e.target.value, 10) || 25)}
                  />
                </label>
                <label className="flex items-center gap-2">
                  <span>Contact enrichment max/run</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    value={pdlEnrichLimit}
                    onChange={(e) => setPdlEnrichLimit(Number.parseInt(e.target.value, 10) || 15)}
                  />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-950/25 text-[var(--x-text)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Address lookup — property records
            </CardTitle>
            <CardDescription className="text-[var(--x-muted)]">
              Parsed US address (commas required; ZIP optional). Merged rows only fill <strong className="text-[var(--x-text)]">empty</strong> fields.
              Configure the Worker secret and API base for local dev.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="text-sm block">
              <span className="mb-1 block font-medium">Address line</span>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={dealmachineAddressLine}
                onChange={(e) => setDealmachineAddressLine(e.target.value)}
                placeholder="123 Main St, City, ST 12345 — or without ZIP"
              />
              <span className="mt-1 block text-xs text-[var(--x-muted)]">
                Format: <strong>Street, City, ST</strong> or <strong>Street, City, ST ZIP</strong>. Fills from the selected row or
                preview when this field is empty.
              </span>
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                type="button"
                variant="default"
                disabled={dealmachineBusy || enrichBusy || pdlEnrichBusy || !isDealMachineLikelyConfigured()}
                onClick={() => void onFetchDealMachineSingle()}
              >
                {dealmachineBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Fetch / merge this address
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={
                  dealmachineBusy || enrichBusy || pdlEnrichBusy || !isDealMachineLikelyConfigured() || !commResults.length
                }
                onClick={() => void onFetchDealMachineBulk()}
              >
                Table batch (up to {dealmachineLimit} calls)
              </Button>
            </div>
            <div className="flex flex-wrap gap-4 items-center border-t border-amber-500/25 pt-3 text-sm">
              <label className="flex items-center gap-2">
                <span>Max calls</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm"
                  value={dealmachineLimit}
                  onChange={(e) => setDealmachineLimit(Number.parseInt(e.target.value, 10) || 15)}
                />
              </label>
              <label className="flex items-center gap-2">
                <span>Delay ms</span>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                  value={dealmachineDelayMs}
                  onChange={(e) => setDealmachineDelayMs(Number.parseInt(e.target.value, 10) || 0)}
                />
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dealmachineSkipIfOwner}
                  onChange={(e) => setDealmachineSkipIfOwner(e.target.checked)}
                />
                Skip rows that already have Owner filled
              </label>
            </div>
          </CardContent>
        </Card>
          </>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-[var(--x-surface)] text-[var(--x-text)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload CSV
              </CardTitle>
              <CardDescription className="text-[var(--x-muted)]">
                Headers: Address, Owner, Phone, Email, State, etc. No API call. You can import very large lists (e.g.{" "}
                <strong className="text-[var(--x-text)]">100,000</strong> commercial / PM rows): parsing yields to the UI, the table is{" "}
                <strong className="text-[var(--x-text)]">virtualized</strong> (only visible rows render), and the full file must stay under ~180MB. For
                free manual research, download the template (assessor + SOS columns) and re-upload when filled.
                {isAdmin ? (
                  <>
                    {" "}
                    Missouri open-parcel scripts:{" "}
                    <code className="rounded bg-gray-100 px-1 text-xs text-[var(--x-text)]">npm run data:mo-parcels</code> → import the generated
                    CSV. Large-building sample:{" "}
                    <code className="rounded bg-gray-100 px-1 text-xs text-[var(--x-text)]">npm run data:mo-commercial-50k</code> (empty phone /
                    contact / email columns for you to fill from a licensed list).
                  </>
                ) : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                className="hidden"
                onChange={onCsvFile}
              />
              <Button type="button" disabled={busy} onClick={() => fileInputRef.current?.click()}>
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Choose CSV
              </Button>
              <Button type="button" variant="secondary" disabled={busy} onClick={onLoadMoOpenDataSample}>
                Load MO open-data sample (200 rows)
              </Button>
              <Button type="button" variant="secondary" onClick={onDownloadFreeRecordsTemplate}>
                <FileDown className="w-4 h-4 mr-2" />
                Blank template (manual research)
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-[var(--x-surface)] text-[var(--x-text)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5" />
                Paste JSON
              </CardTitle>
              <CardDescription className="text-[var(--x-muted)]">Single property object; clears the results table.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                className="min-h-[100px] w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm placeholder:text-[var(--x-muted)]"
                value={jsonPaste}
                onChange={(e) => setJsonPaste(e.target.value)}
                placeholder='{ "formattedAddress": "123 Main St, City, ST 12345" }'
              />
              <Button type="button" variant="secondary" onClick={onParseJson}>
                Parse JSON
              </Button>
            </CardContent>
          </Card>
        </div>

        {isAdmin ? (
        <Card className="border-violet-500/30 bg-violet-950/25 text-[var(--x-text)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Bulk enrichment (editor)
            </CardTitle>
            <CardDescription className="text-[var(--x-muted)]">
              Run bulk owner / phone / contact enrichment from your development environment (not on this page). Example
              intent: property mailing address; assessor-style owner entity; main phone; registered-agent or principal
              contact where visible. Start with a CSV that has at least <code className="rounded bg-[#1a1d26] px-1 text-xs text-[var(--x-text)]">property_address</code>{" "}
              or owner + city columns, then import the enriched file here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 rounded-md border border-white/[0.08] bg-black/25 p-4 text-sm">
            <ol className="list-decimal pl-5 space-y-2">
              <li>Install and configure your team&apos;s bulk-enrichment CLI in the editor.</li>
              <li>
                Run it with a seed CSV (property address and/or owner entity) and the fields you need for outreach.
              </li>
              <li>
                When the job finishes, use <strong>Choose CSV</strong> above to import the enriched file (map headers to the
                template if needed).
              </li>
            </ol>
          </CardContent>
        </Card>
        ) : null}

        {commResults.length > 0 || preview ? (
          <div className="flex flex-wrap gap-2 items-center">
            <Button type="button" variant="secondary" size="sm" onClick={onDownloadCampaignCsv}>
              <FileDown className="w-4 h-4 mr-2" />
              {commResults.length > 0
                ? `Export outreach CSV (${commResults.length} rows)`
                : "Export outreach CSV (current preview)"}
            </Button>
            <span className="text-xs text-[var(--x-muted)]">
              Spreadsheet / mail merge — same columns as the manual-research template.
            </span>
          </div>
        ) : null}

        {commResults.length > 0 ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              {showVendorEnrichment ? (
                <>
                  <span className="text-sm font-medium text-[var(--x-text)]">Data enhancement (loaded rows)</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={enrichBusy || pdlEnrichBusy || dealmachineBusy || !placesKey.trim()}
                    onClick={() => void onEnrichBulk()}
                  >
                    {enrichBusy ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Phone className="w-4 h-4 mr-2" />
                    )}
                    Phone lookup (up to {enrichLimit})
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={
                      enrichBusy ||
                      pdlEnrichBusy ||
                      dealmachineBusy ||
                      !pdlKey.trim() ||
                      (!pdlCompanyRows && !pdlIncludeIndividuals)
                    }
                    onClick={() => void onEnrichBulkPdl()}
                  >
                    {pdlEnrichBusy ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <UserSearch className="w-4 h-4 mr-2" />
                    )}
                    Contact enrichment (up to {pdlEnrichLimit})
                  </Button>
                  <span className="text-xs text-[var(--x-muted)]">Skips rows that already have digits in Phone(s).</span>
                </>
              ) : propertyScraperOffline ? (
                <span className="text-xs text-[var(--x-muted)]">
                  CSV-only mode: add <code className="rounded bg-gray-100 px-1 text-xs text-[var(--x-text)]">phone</code> / contact columns in
                  your spreadsheet, then re-import — or use manual people search / clipboard merge below.
                </span>
              ) : (
                <span className="text-xs text-[var(--x-muted)]">
                  API-assisted row enrichment is limited to administrator accounts. Add phone and contact columns in your CSV,
                  or use manual people search below.
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--x-muted)]">
              Manual people search: use the preview row shortcuts below, or open{" "}
              <a
                className="text-[var(--x-accent)] underline hover:opacity-90"
                href={FAST_PEOPLE_SEARCH_HOME_LANG_EN}
                target="_blank"
                rel="noreferrer noopener"
              >
                a search site
              </a>{" "}
              in a new tab.
            </p>
            <VirtualizedPropertyLeadTable
              rows={commResults}
              selectedRowIndex={selectedRowIndex}
              onSelectRow={(index, row) => {
                setSelectedRowIndex(index);
                setPreview(row);
              }}
            />
          </div>
        ) : null}

        {preview ? (
          <Card className="bg-[var(--x-surface)] text-[var(--x-text)]">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription className="text-[var(--x-muted)]">Selected property row</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium block">Address</span>
                  <div className="font-medium">{preview.address}</div>
                </div>
                <div>
                  <span className="font-medium block">State</span>
                  <div>{preview.stateCode || "—"}</div>
                </div>
                <div>
                  <span className="font-medium block">Lat / Lng</span>
                  <div>
                    {preview.latitude || "—"}, {preview.longitude || "—"}
                  </div>
                </div>
                <div>
                  <span className="font-medium block">Living area (SF)</span>
                  <div>{preview.areaSqFt || "—"}</div>
                </div>
                <div>
                  <span className="font-medium block">Lot (SF)</span>
                  <div>{preview.lotSizeSqFt || "—"}</div>
                </div>
                <div>
                  <span className="font-medium block">Year built</span>
                  <div>{preview.yearBuilt || "—"}</div>
                </div>
                <div>
                  <span className="font-medium block">Type</span>
                  <div>{preview.propertyType}</div>
                </div>
                <div>
                  <span className="font-medium block">Commercial lead score</span>
                  <div>{preview.leadScore != null ? `${preview.leadScore}/100` : "—"}</div>
                </div>
                <div>
                  <span className="font-medium block">Portfolio (same owner, this batch)</span>
                  <div>{preview.ownerPortfolioCount != null ? preview.ownerPortfolioCount : "—"}</div>
                </div>
                {preview.leadScoreReasons?.length ? (
                  <div className="sm:col-span-2">
                    <span className="font-medium block">Score factors</span>
                    <ul className="list-disc pl-5 text-xs space-y-0.5 mt-1">
                      {preview.leadScoreReasons.map((line, idx) => (
                        <li key={idx}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="sm:col-span-2">
                  <span className="font-medium block">Owner name (deed or assessor)</span>
                  <div className="whitespace-pre-wrap">{preview.ownerName || "—"}</div>
                </div>
                <div>
                  <span className="font-medium block">PM / organization label</span>
                  <div>{preview.ownerPmEntityLabel?.trim() || "—"}</div>
                </div>
                <div>
                  <span className="font-medium block">Entity type</span>
                  <div>{preview.ownerEntityType || "—"}</div>
                </div>
                <div className="sm:col-span-2">
                  <span className="font-medium block">Owner mailing</span>
                  <div className="whitespace-pre-wrap">{preview.ownerMailingAddress || "—"}</div>
                </div>
                <div className="sm:col-span-2">
                  <span className="font-medium block">Phone(s) — main / alternate</span>
                  <div className="whitespace-pre-wrap">{preview.ownerPhone || "—"}</div>
                </div>
                <div className="sm:col-span-2">
                  <span className="font-medium block">Contact person (individual)</span>
                  <div className="whitespace-pre-wrap">{preview.contactPersonName || "—"}</div>
                </div>
                <div className="sm:col-span-2">
                  <span className="font-medium block">Contact person phone</span>
                  <div className="whitespace-pre-wrap">{preview.contactPersonPhone || "—"}</div>
                </div>
                <div className="sm:col-span-2">
                  <span className="font-medium block">Email(s)</span>
                  <div className="whitespace-pre-wrap break-all">{preview.ownerEmail || "—"}</div>
                </div>
              </dl>
              {preview.notes ? (
                <p className="border-t border-white/[0.1] pt-3 text-xs whitespace-pre-wrap text-[var(--x-muted)]">{preview.notes}</p>
              ) : null}
              <div className="space-y-2 border-t border-white/[0.08] pt-3">
                <p className="text-xs font-medium text-[var(--x-text)]">Manual people search</p>
                <p className="text-xs text-[var(--x-muted)]">
                  Opens new tabs only — this app does not scrape third-party sites. After you find a match, type the{" "}
                  <strong>person&apos;s name</strong> below and/or copy a snippet with their numbers, then{" "}
                  <strong>Merge phones from clipboard</strong> (saved as contact person phone; main lines stay in Phone(s)).
                  Lead score updates when numbers are added. Comply with site terms and privacy law.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={FAST_PEOPLE_SEARCH_HOME_LANG_EN} target="_blank" rel="noreferrer noopener">
                      <ExternalLink className="w-4 h-4" />
                      People search (home)
                    </a>
                  </Button>
                  {(() => {
                    const primary = (preview.contactPersonName || primaryOwnerName(preview.ownerName)).trim();
                    const ownerQ = [
                      primary,
                      extractCityFromPropertyAddress(preview.address),
                      preview.stateCode.trim().toUpperCase().slice(0, 2),
                    ]
                      .filter(Boolean)
                      .join(" ")
                      .trim();
                    return primary ? (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={googleSiteSearchFastPeopleUrl(ownerQ)}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Search (owner + area)
                        </a>
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" size="sm" disabled title="Need owner name for this search">
                        <ExternalLink className="w-4 h-4" />
                        Search (owner + area)
                      </Button>
                    );
                  })()}
                  {preview.address.trim() ? (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={googleSiteSearchFastPeopleUrl(preview.address)}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Search (property address)
                      </a>
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" size="sm" disabled title="Need property address">
                      <ExternalLink className="w-4 h-4" />
                      Search (property address)
                    </Button>
                  )}
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                  <label className="text-xs flex-1 min-w-[220px]">
                    <span className="mb-1 block font-medium">Contact person name (from lookup)</span>
                    <input
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      value={manualFpsOwnerName}
                      onChange={(e) => setManualFpsOwnerName(e.target.value)}
                      placeholder="Type the name from your search…"
                    />
                  </label>
                  <Button type="button" variant="secondary" size="sm" onClick={onApplyManualOwnerNameFps}>
                    Add name to record
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => void onMergeClipboardPhonesFps()}>
                    <ClipboardPaste className="w-4 h-4" />
                    Merge phones from clipboard
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {showVendorEnrichment ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={enrichBusy || pdlEnrichBusy || dealmachineBusy || !placesKey.trim()}
                      onClick={() => void onEnrichPreview()}
                    >
                      {enrichBusy ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Phone className="w-4 h-4 mr-2" />
                      )}
                      Enhance: phone lookup
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={
                        enrichBusy ||
                        pdlEnrichBusy ||
                        dealmachineBusy ||
                        !pdlKey.trim() ||
                        (!pdlCompanyRows && !pdlIncludeIndividuals)
                      }
                      onClick={() => void onEnrichPreviewPdl()}
                    >
                      {pdlEnrichBusy ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <UserSearch className="w-4 h-4 mr-2" />
                      )}
                      Enhance: contacts
                    </Button>
                  </>
                ) : null}
                <Button type="button" onClick={sendToMeasurement}>
                  Open in New Measurement
                </Button>
                <Link to="/measurement/new">
                  <Button type="button" variant="outline">
                    Go without importing
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
