import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  Building2,
  ClipboardPaste,
  ExternalLink,
  FileDown,
  KeyRound,
  Loader2,
  Phone,
  Search,
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

const fieldClass =
  "w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-[var(--x-text)] outline-none placeholder:text-[var(--x-muted)] focus:border-sky-500/50";

export function PropertyScraper() {
  const { user } = useAuth();
  const isAdmin = user?.user_type === "admin";
  const showVendorEnrichment = isAdmin && import.meta.env.VITE_PROPERTY_SCRAPER_OFFLINE !== "true";
  const propertyScraperOffline = import.meta.env.VITE_PROPERTY_SCRAPER_OFFLINE === "true";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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

  const anyBusy = busy || enrichBusy || pdlEnrichBusy || dealmachineBusy;

  const statusLine = useMemo(() => {
    if (csvParseProgress) {
      return {
        kind: "ok" as const,
        text:
          csvParseProgress.phase === "parsing"
            ? `Parsing CSV… ${csvParseProgress.rows.toLocaleString()} rows so far`
            : `Ranking ${csvParseProgress.rows.toLocaleString()} rows…`,
      };
    }
    return message;
  }, [csvParseProgress, message]);

  useEffect(() => {
    const fromQuery = searchParams.get("address")?.trim();
    if (fromQuery) setDealmachineAddressLine(fromQuery);
  }, [searchParams]);

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

  const hasRows = commResults.length > 0;
  const hasPreview = Boolean(preview);

  return (
    <div className="hd2d-page-shell max-w-5xl text-[var(--x-text)]">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-semibold sm:text-3xl">Property records</h1>
        <p className="max-w-2xl text-[var(--x-muted)]">
          Look up an owner by address, or import a CSV. Open a row in Measurement when you&apos;re ready to estimate.
        </p>
      </div>

      {statusLine ? (
        <div
          className={
            statusLine.kind === "err"
              ? "mb-4 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-2 text-sm"
              : "mb-4 rounded-lg border border-emerald-500/35 bg-emerald-950/35 px-4 py-2 text-sm"
          }
          role="status"
        >
          {statusLine.text}
        </div>
      ) : null}

      <div className="space-y-6">
        {/* 1. Lookup */}
        <Card className="border-white/[0.08] bg-[var(--x-surface)]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5" aria-hidden />
              Look up address
            </CardTitle>
            <CardDescription>
              Street, City, ST (ZIP optional). Uses your org&apos;s property-record lookup on the server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--x-muted)]">
                Address
              </span>
              <input
                type="text"
                className={fieldClass}
                value={dealmachineAddressLine}
                onChange={(e) => setDealmachineAddressLine(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void onFetchDealMachineSingle();
                  }
                }}
                placeholder="123 Main St, City, ST 12345"
                disabled={!isDealMachineLikelyConfigured()}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={anyBusy || !isDealMachineLikelyConfigured()}
                onClick={() => void onFetchDealMachineSingle()}
              >
                {dealmachineBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Find owner
              </Button>
              {!isDealMachineLikelyConfigured() ? (
                <span className="self-center text-xs text-[var(--x-muted)]">
                  Lookup API not configured for this environment.
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* 2. Import */}
        <Card className="border-white/[0.08] bg-[var(--x-surface)]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5" aria-hidden />
              Import list
            </CardTitle>
            <CardDescription>
              CSV with address, owner, and any phones you already have. Large files use a virtualized table.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={onCsvFile}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={() => fileInputRef.current?.click()}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Choose CSV
              </Button>
              <Button type="button" variant="secondary" onClick={onDownloadFreeRecordsTemplate}>
                <FileDown className="mr-2 h-4 w-4" />
                Blank template
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={onLoadMoOpenDataSample}>
                Sample (200 rows)
              </Button>
            </div>
            <details className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm">
              <summary className="cursor-pointer text-[var(--x-muted)] hover:text-[var(--x-text)]">
                Paste JSON (single property)
              </summary>
              <div className="mt-3 space-y-2">
                <textarea
                  className={`${fieldClass} min-h-[88px] font-mono`}
                  value={jsonPaste}
                  onChange={(e) => setJsonPaste(e.target.value)}
                  placeholder='{ "formattedAddress": "123 Main St, City, ST 12345" }'
                />
                <Button type="button" variant="secondary" size="sm" onClick={onParseJson}>
                  Parse JSON
                </Button>
              </div>
            </details>
          </CardContent>
        </Card>

        {/* Empty state */}
        {!hasRows && !hasPreview ? (
          <Card className="border-dashed border-white/15 bg-transparent">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Building2 className="mb-3 h-10 w-10 text-[var(--x-muted)]" aria-hidden />
              <p className="text-lg font-medium">No properties yet</p>
              <p className="mt-1 max-w-sm text-sm text-[var(--x-muted)]">
                Enter an address and find the owner, or drop a CSV to build your list.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Results toolbar + table */}
        {hasRows || hasPreview ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onDownloadCampaignCsv}>
              <FileDown className="mr-2 h-4 w-4" />
              {hasRows
                ? `Export CSV (${commResults.length.toLocaleString()} rows)`
                : "Export preview CSV"}
            </Button>
            {hasPreview ? (
              <Button type="button" size="sm" onClick={sendToMeasurement}>
                Open in Measurement
              </Button>
            ) : null}
          </div>
        ) : null}

        {hasRows ? (
          <div className="space-y-2">
            <p className="text-xs text-[var(--x-muted)]">
              {commResults.length.toLocaleString()} rows · click a row to preview · ranked by commercial lead score
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
          <Card className="border-white/[0.08] bg-[var(--x-surface)] text-[var(--x-text)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Selected property</CardTitle>
              <CardDescription>{preview.address || "No address"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--x-muted)]">Owner</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap font-medium">{preview.ownerName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--x-muted)]">Phone(s)</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap">{preview.ownerPhone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--x-muted)]">Mailing</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap">{preview.ownerMailingAddress || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--x-muted)]">Email</dt>
                  <dd className="mt-0.5 break-all whitespace-pre-wrap">{preview.ownerEmail || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--x-muted)]">Living / lot (SF)</dt>
                  <dd className="mt-0.5">
                    {preview.areaSqFt || "—"} / {preview.lotSizeSqFt || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--x-muted)]">Year · type · score</dt>
                  <dd className="mt-0.5">
                    {[preview.yearBuilt || "—", preview.propertyType || "—", preview.leadScore != null ? `${preview.leadScore}/100` : "—"].join(
                      " · ",
                    )}
                  </dd>
                </div>
                {(preview.contactPersonName || preview.contactPersonPhone) && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-[var(--x-muted)]">Contact person</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap">
                      {[preview.contactPersonName, preview.contactPersonPhone].filter(Boolean).join(" · ") || "—"}
                    </dd>
                  </div>
                )}
              </dl>

              <details className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm">
                <summary className="cursor-pointer text-[var(--x-muted)] hover:text-[var(--x-text)]">
                  Manual people search &amp; merge
                </summary>
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-[var(--x-muted)]">
                    Opens new tabs only — nothing is scraped. Paste a name and/or copy phones, then merge into this row.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={FAST_PEOPLE_SEARCH_HOME_LANG_EN} target="_blank" rel="noreferrer noopener">
                        <ExternalLink className="h-4 w-4" />
                        People search
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
                          <a href={googleSiteSearchFastPeopleUrl(ownerQ)} target="_blank" rel="noreferrer noopener">
                            <ExternalLink className="h-4 w-4" />
                            Owner + area
                          </a>
                        </Button>
                      ) : (
                        <Button type="button" variant="outline" size="sm" disabled>
                          <ExternalLink className="h-4 w-4" />
                          Owner + area
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
                          <ExternalLink className="h-4 w-4" />
                          By address
                        </a>
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                    <label className="min-w-[220px] flex-1 text-xs">
                      <span className="mb-1 block font-medium">Contact person name</span>
                      <input
                        className={fieldClass}
                        value={manualFpsOwnerName}
                        onChange={(e) => setManualFpsOwnerName(e.target.value)}
                        placeholder="Name from your search…"
                      />
                    </label>
                    <Button type="button" variant="secondary" size="sm" onClick={onApplyManualOwnerNameFps}>
                      Add name
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => void onMergeClipboardPhonesFps()}>
                      <ClipboardPaste className="h-4 w-4" />
                      Merge phones
                    </Button>
                  </div>
                </div>
              </details>

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={sendToMeasurement}>
                  Open in Measurement
                </Button>
                <Link to="/measurement/new">
                  <Button type="button" variant="outline">
                    Measurement without import
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* 3. Advanced enrich (admin) */}
        {showVendorEnrichment ? (
          <details className="rounded-xl border border-white/10 bg-[var(--x-surface)] px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-[var(--x-muted)] hover:text-[var(--x-text)] [&::-webkit-details-marker]:hidden">
              <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
              Advanced — bulk lookup &amp; enrich
            </summary>
            <div className="mt-4 space-y-6 border-t border-white/10 pt-4">
              <p className="text-xs text-[var(--x-muted)]">
                Optional vendor APIs for admins. Keys stay in this browser. Prefer county assessor / open data when you can.
              </p>

              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <KeyRound className="h-4 w-4" aria-hidden />
                  API keys
                </h3>
                <label className="block text-xs">
                  <span className="mb-1 block text-[var(--x-muted)]">Google Places (phone lookup)</span>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="password"
                      autoComplete="off"
                      className={`${fieldClass} min-w-[200px] flex-1`}
                      value={placesKey}
                      onChange={(e) => setPlacesKey(e.target.value)}
                      placeholder="AIza…"
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={persistPlacesKey}>
                      Save
                    </Button>
                  </div>
                </label>
                <label className="block text-xs">
                  <span className="mb-1 block text-[var(--x-muted)]">People Data Labs (contacts)</span>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="password"
                      autoComplete="off"
                      className={`${fieldClass} min-w-[200px] flex-1`}
                      value={pdlKey}
                      onChange={(e) => setPdlKey(e.target.value)}
                      placeholder="PDL key…"
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={persistPdlKey}>
                      Save
                    </Button>
                  </div>
                </label>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium">Bulk property-record lookup</h3>
                <p className="text-xs text-[var(--x-muted)]">
                  Runs on imported CSV rows (not the single address box above). Cap API calls per run.
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-xs">
                    <span className="mb-1 block text-[var(--x-muted)]">Max calls</span>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      className={`${fieldClass} w-24`}
                      value={dealmachineLimit}
                      onChange={(e) => setDealmachineLimit(Number(e.target.value) || 15)}
                    />
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block text-[var(--x-muted)]">Delay (ms)</span>
                    <input
                      type="number"
                      min={0}
                      max={5000}
                      className={`${fieldClass} w-28`}
                      value={dealmachineDelayMs}
                      onChange={(e) => setDealmachineDelayMs(Number(e.target.value) || 0)}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={dealmachineSkipIfOwner}
                      onChange={(e) => setDealmachineSkipIfOwner(e.target.checked)}
                    />
                    Skip rows that already have an owner
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={anyBusy || !commResults.length || !isDealMachineLikelyConfigured()}
                    onClick={() => void onFetchDealMachineBulk()}
                  >
                    {dealmachineBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    Lookup missing owners
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium">Phone &amp; contact enrich</h3>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-xs">
                    <span className="mb-1 block text-[var(--x-muted)]">Places limit</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      className={`${fieldClass} w-24`}
                      value={enrichLimit}
                      onChange={(e) => setEnrichLimit(Number(e.target.value) || 25)}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={enrichBusinessOnly}
                      onChange={(e) => setEnrichBusinessOnly(e.target.checked)}
                    />
                    Business-like rows only
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={anyBusy || !commResults.length || !placesKey.trim()}
                    onClick={() => void onEnrichBulk()}
                  >
                    {enrichBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
                    Enrich phones (bulk)
                  </Button>
                  {preview ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={anyBusy || !placesKey.trim()}
                      onClick={() => void onEnrichPreview()}
                    >
                      Phone (selected)
                    </Button>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-xs">
                    <span className="mb-1 block text-[var(--x-muted)]">PDL limit</span>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      className={`${fieldClass} w-24`}
                      value={pdlEnrichLimit}
                      onChange={(e) => setPdlEnrichLimit(Number(e.target.value) || 15)}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={pdlCompanyRows} onChange={(e) => setPdlCompanyRows(e.target.checked)} />
                    Companies
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={pdlIncludeIndividuals}
                      onChange={(e) => setPdlIncludeIndividuals(e.target.checked)}
                    />
                    Individuals
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={
                      anyBusy ||
                      !commResults.length ||
                      !pdlKey.trim() ||
                      (!pdlCompanyRows && !pdlIncludeIndividuals)
                    }
                    onClick={() => void onEnrichBulkPdl()}
                  >
                    {pdlEnrichBusy ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserSearch className="mr-2 h-4 w-4" />
                    )}
                    Enrich contacts (bulk)
                  </Button>
                  {preview ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={anyBusy || !pdlKey.trim() || (!pdlCompanyRows && !pdlIncludeIndividuals)}
                      onClick={() => void onEnrichPreviewPdl()}
                    >
                      Contacts (selected)
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </details>
        ) : null}

        {propertyScraperOffline ? (
          <p className="text-xs text-[var(--x-muted)]">Offline mode: vendor enrich APIs are disabled.</p>
        ) : null}
      </div>
    </div>
  );
}
