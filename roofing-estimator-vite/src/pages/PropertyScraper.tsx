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
  PROPERTY_SCRAPER_GOOGLE_PLACES_KEY_STORAGE,
} from "../lib/propertyPhoneEnrichment";
import {
  enrichPropertyRecordWithPdl,
  enrichPropertyRecordsWithPdl,
  PROPERTY_SCRAPER_PDL_KEY_STORAGE,
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

function sourceLabel(source: PropertyImportPayload["source"]): string {
  if (source === "csv-upload") return "CSV upload";
  if (source === "json-paste") return "JSON paste";
  if (source === "import") return "Import";
  if (source === "rentcast") return "Legacy import";
  if (source === "batchdata") return "BatchData";
  if (source === "dealmachine") return "DealMachine";
  return "Import";
}

const FPS_MANUAL_SOURCE = "FastPeopleSearch";

/** Browser read + string size guard for huge CSVs (memory is still ~file size + parsed rows). */
const MAX_PROPERTY_CSV_BYTES = 180 * 1024 * 1024;

export function PropertyScraper() {
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

  /** Typed after manual lookup on FastPeopleSearch (pasted name optional; phones via clipboard). */
  const [manualFpsOwnerName, setManualFpsOwnerName] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PROPERTY_SCRAPER_GOOGLE_PLACES_KEY_STORAGE);
      const fromEnv = import.meta.env.VITE_GOOGLE_PLACES_API_KEY?.trim();
      if (saved) setPlacesKey(saved);
      else if (fromEnv) setPlacesKey(fromEnv);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PROPERTY_SCRAPER_PDL_KEY_STORAGE);
      const fromEnv = import.meta.env.VITE_PDL_API_KEY?.trim();
      if (saved) setPdlKey(saved);
      else if (fromEnv) setPdlKey(fromEnv);
    } catch {
      /* ignore */
    }
  }, []);

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
      window.localStorage.setItem(PROPERTY_SCRAPER_GOOGLE_PLACES_KEY_STORAGE, placesKey.trim());
      setMessage({ kind: "ok", text: "Google Places API key saved in this browser." });
    } catch {
      setMessage({ kind: "err", text: "Could not save Places key." });
    }
  }, [placesKey]);

  const persistPdlKey = useCallback(() => {
    try {
      window.localStorage.setItem(PROPERTY_SCRAPER_PDL_KEY_STORAGE, pdlKey.trim());
      setMessage({ kind: "ok", text: "People Data Labs API key saved in this browser." });
    } catch {
      setMessage({ kind: "err", text: "Could not save PDL key." });
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
          text: "Loaded property row from DealMachine. Open in measurement or export when ready.",
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
        text: "Merged DealMachine fields into the selected / matching row (empty fields only).",
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
        text: `DealMachine: filled ${filled} row(s); skipped ${skipped}; errors ${failed}. Max ${dealmachineLimit} API calls this run.`,
      });
    } finally {
      setDealmachineBusy(false);
    }
  }, [dealmachineDelayMs, dealmachineLimit, dealmachineSkipIfOwner, commResults, preview, selectedRowIndex]);

  const onEnrichBulk = useCallback(async () => {
    if (!commResults.length) {
      setMessage({ kind: "err", text: "Load rows first (CSV or Parallel-enriched CSV)." });
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
        text: `Places enhancement: filled phone on ${filled} row(s); skipped ${skipped}; no phone for ${failed} attempt(s). Max ${enrichLimit} calls per run.`,
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
            ? "Updated phone from Google Places (see Phones and notes)."
            : "No new phone returned from Places for this owner/location.",
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
      setMessage({ kind: "err", text: "Enable company rows and/or individual owners for PDL." });
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
        text: `PDL enhancement: updated ${filled} row(s); skipped ${skipped}; no match / error on ${failed} attempt(s). Max ${pdlEnrichLimit} calls per run.`,
      });
    } finally {
      setPdlEnrichBusy(false);
    }
  }, [commResults, pdlCompanyRows, pdlEnrichLimit, pdlIncludeIndividuals, pdlKey, preview, selectedRowIndex]);

  const onEnrichPreviewPdl = useCallback(async () => {
    if (!preview) return;
    if (!pdlCompanyRows && !pdlIncludeIndividuals) {
      setMessage({ kind: "err", text: "Enable company and/or individual PDL lookups." });
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
            ? "Updated contact fields from People Data Labs (see Phones, contact person, Email, notes)."
            : notesChanged
              ? "PDL details in notes (match may lack phone — check notes)."
              : "PDL did not add new contact fields for this row.",
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
          text: "Loaded 200-row Missouri open-data sample (St. Louis City + Kansas City parcels). For the full ~333k-row file, run npm run data:mo-parcels and import data/mo-stl-kc-open-data-import.csv.",
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
            text: `Imported ${n} row(s) from ${file.name}; ranked by commercial lead score. Table uses virtual scrolling for large lists. Enhance with Places/PDL/DealMachine as needed.`,
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
    setMessage({ kind: "ok", text: "Parsed JSON. Enhance with Places/PDL if you have keys, then open in measurement." });
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
        text: "Nothing to export. Import a CSV (or Parallel-enriched CSV) or load a property preview first.",
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
          text: "No US phone numbers in clipboard. On FastPeopleSearch, select and copy the block of text that includes numbers, then try again.",
        });
        return;
      }
      const merged = mergePhonesFromManualResearch(preview, phones, FPS_MANUAL_SOURCE);
      applyMergedPreviewToTable(merged);
      setMessage({
        kind: "ok",
        text: `Merged ${phones.length} phone number(s) into contact person phone (source: ${FPS_MANUAL_SOURCE}). Company/main lines stay in Phone(s).`,
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
        text: `Type the owner or contact name you found on ${FPS_MANUAL_SOURCE}, then click Add name.`,
      });
      return;
    }
    setMessage(null);
    const merged = mergeOwnerNameFromManualResearch(preview, n, FPS_MANUAL_SOURCE);
    applyMergedPreviewToTable(merged);
    setManualFpsOwnerName("");
    setMessage({
      kind: "ok",
      text: `Contact person name saved (deed / company name unchanged). Source: ${FPS_MANUAL_SOURCE}.`,
    });
  }, [applyMergedPreviewToTable, manualFpsOwnerName, preview]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 text-black sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-semibold text-black sm:text-3xl">Property records</h1>
        <p className="text-black max-w-3xl">
          <strong>Open parcel data does not include owner phone numbers.</strong> The app cannot invent 50,000 accurate
          phones or contacts — that requires a <strong>file you are licensed to use</strong> (CRM export, dialer list, data
          vendor, etc.) with <code className="text-xs bg-gray-100 px-1 rounded">phone</code>,{" "}
          <code className="text-xs bg-gray-100 px-1 rounded">contact_person_name</code>, and{" "}
          <code className="text-xs bg-gray-100 px-1 rounded">email</code> columns, or slow manual / SOS research per row.
        </p>
        <p className="text-black max-w-3xl mt-3">
          <strong>No RentCast.</strong> Import a <strong>CSV</strong> with property address, owner / entity name, mailing
          address, and any phones you already have. For bulk web-sourced fields (where allowed), use Cursor{" "}
          <strong>Parallel</strong> in the terminal (
          <code className="text-xs bg-gray-100 px-1 rounded">/parallel-setup</code>,{" "}
          <code className="text-xs bg-gray-100 px-1 rounded">/parallel-enrich</code>) and <strong>re-upload</strong> the
          enriched file.
          {!propertyScraperOffline ? (
            <>
              {" "}
              Optional in-browser <strong>DealMachine</strong>, <strong>Google Places</strong>, and{" "}
              <strong>People Data Labs</strong> can fill some gaps when you add keys (localhost dev proxy).
            </>
          ) : (
            <>
              {" "}
              <strong>DealMachine / Places / PDL</strong> panels are off (
              <code className="text-xs bg-gray-100 px-1 rounded">VITE_PROPERTY_SCRAPER_OFFLINE=true</code>).
            </>
          )}{" "}
          <strong>FastPeopleSearch</strong> (
          <a
            href="https://www.fastpeoplesearch.com/?lang=en"
            className="text-black underline"
            target="_blank"
            rel="noreferrer"
          >
            fastpeoplesearch.com/?lang=en
          </a>
          ): manual lookup + <strong>merge phones from clipboard</strong> per preview row.
        </p>
      </div>

      {csvParseProgress ? (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-black">
          {csvParseProgress.phase === "parsing"
            ? `Parsing CSV… ${csvParseProgress.rows.toLocaleString()} rows converted so far (large files may take a minute).`
            : `Ranking ${csvParseProgress.rows.toLocaleString()} rows by commercial lead score…`}
        </div>
      ) : null}

      {message ? (
        <div
          className={
            message.kind === "err"
              ? "mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-black"
              : "mb-4 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm text-black"
          }
        >
          {message.text}
        </div>
      ) : null}

      <div className="space-y-6">
        <Card className="text-black border-emerald-200 bg-emerald-50/35">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-black">
              <Landmark className="w-5 h-5" />
              County assessor &amp; free public records
            </CardTitle>
            <CardDescription className="text-black">
              No API keys required. Use your county <strong>assessor</strong> (or cadastral) site for owner, mailing address,
              parcel, and building use; use state <strong>Secretary of State</strong> (or business registry) for registered
              agent and entity address. Download <strong>Blank template (manual research)</strong> under Upload CSV, fill
              columns, then re-import. Extra columns (registered agent, brokerage) map into notes automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-black space-y-2">
            <p className="font-medium">Optional bulk web enrichment (Cursor + Parallel)</p>
            <p className="text-neutral-800">
              After you <strong>Export outreach CSV</strong>, you can run Parallel bulk enrichment from the editor (e.g.{" "}
              <code className="text-xs bg-white px-1 rounded border border-gray-200">/parallel-setup</code> then{" "}
              <code className="text-xs bg-white px-1 rounded border border-gray-200">/parallel-enrich</code> with the
              fields you want). Comply with Parallel&apos;s terms and each website&apos;s rules.
            </p>
          </CardContent>
        </Card>

        {!propertyScraperOffline ? (
          <>
          <Card className="text-black border-blue-200 bg-blue-50/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-black">
                <KeyRound className="w-5 h-5" />
                API keys &amp; data enhancement
              </CardTitle>
              <CardDescription className="text-black">
                Optional in-browser enrichers after CSV import. Keys stay in this browser (localStorage) or{" "}
                <code className="text-xs bg-white px-1 rounded">.env.local</code> (
                <code className="text-xs bg-white px-1 rounded">VITE_GOOGLE_PLACES_API_KEY</code>,{" "}
                <code className="text-xs bg-white px-1 rounded">VITE_PDL_API_KEY</code>). DealMachine uses the Worker
                only (<code className="text-xs bg-white px-1 rounded">DEALMACHINE_API_KEY</code>). For{" "}
              <a
                href={FAST_PEOPLE_SEARCH_HOME_LANG_EN}
                className="underline text-black"
                target="_blank"
                rel="noreferrer"
              >
                FastPeopleSearch
              </a>
              , use the preview links — manual browser tabs only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-black">
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
              <label className="text-sm block">
                <span className="text-black block mb-1 font-medium">Google Places (phones)</span>
                <input
                  type="password"
                  autoComplete="off"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
                  value={placesKey}
                  onChange={(e) => setPlacesKey(e.target.value)}
                  placeholder="API key"
                />
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={persistPlacesKey}>
                  Save
                </Button>
              </label>
              <label className="text-sm block">
                <span className="text-black block mb-1 font-medium">People Data Labs</span>
                <input
                  type="password"
                  autoComplete="off"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
                  value={pdlKey}
                  onChange={(e) => setPdlKey(e.target.value)}
                  placeholder="X-Api-Key"
                />
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={persistPdlKey}>
                  Save
                </Button>
              </label>
            </div>
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <p className="text-sm font-medium text-black">PDL enhancement options (bulk + preview)</p>
              <div className="flex flex-wrap gap-4 items-center text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pdlCompanyRows}
                    onChange={(e) => setPdlCompanyRows(e.target.checked)}
                  />
                  Company / LLC / org rows
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pdlIncludeIndividuals}
                    onChange={(e) => setPdlIncludeIndividuals(e.target.checked)}
                  />
                  Individual owners (Person API)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enrichBusinessOnly}
                    onChange={(e) => setEnrichBusinessOnly(e.target.checked)}
                  />
                  Places: LLC / org-style names only
                </label>
                <label className="flex items-center gap-2">
                  <span>Places max/run</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm text-black"
                    value={enrichLimit}
                    onChange={(e) => setEnrichLimit(Number.parseInt(e.target.value, 10) || 25)}
                  />
                </label>
                <label className="flex items-center gap-2">
                  <span>PDL max/run</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm text-black"
                    value={pdlEnrichLimit}
                    onChange={(e) => setPdlEnrichLimit(Number.parseInt(e.target.value, 10) || 15)}
                  />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="text-black border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-black">
              <Building2 className="w-5 h-5" />
              DealMachine — fetch property records
            </CardTitle>
            <CardDescription className="text-black">
              Uses the DealMachine public API (proxied by the HD2D Worker). Parsed US address (commas required; ZIP optional).
              Merged rows only fill <strong>empty</strong> fields. Configure{" "}
              <code className="text-xs bg-white px-1 rounded">DEALMACHINE_API_KEY</code> on the Worker (wrangler secret or{" "}
              <code className="text-xs bg-white px-1 rounded">.dev.vars</code>) and set <code className="text-xs bg-white px-1 rounded">VITE_INTEL_API_BASE</code>{" "}
              for local dev.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-black">
            <label className="text-sm block">
              <span className="block mb-1 font-medium">Address line</span>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
                value={dealmachineAddressLine}
                onChange={(e) => setDealmachineAddressLine(e.target.value)}
                placeholder="123 Main St, City, ST 12345 — or without ZIP"
              />
              <span className="text-xs text-neutral-600 mt-1 block">
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
                DealMachine table (up to {dealmachineLimit} calls)
              </Button>
            </div>
            <div className="flex flex-wrap gap-4 items-center text-sm border-t border-amber-200/80 pt-3">
              <label className="flex items-center gap-2">
                <span>Max calls</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm text-black"
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
                  className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-black"
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
          <Card className="text-black">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-black">
                <Upload className="w-5 h-5" />
                Upload CSV
              </CardTitle>
              <CardDescription className="text-black">
                Headers: Address, Owner, Phone, Email, State, etc. No API call. You can import very large lists (e.g.{" "}
                <strong>100,000</strong> commercial / PM rows): parsing yields to the UI, the table is{" "}
                <strong>virtualized</strong> (only visible rows render), and the full file must stay under ~180MB. For
                free manual research, download the template (assessor + SOS columns) and re-upload when filled.{" "}
                <strong>St. Louis City</strong> and <strong>Kansas City MO</strong> open parcels:{" "}
                <code className="text-xs bg-gray-100 px-1 rounded">npm run data:mo-parcels</code> →{" "}
                <code className="text-xs bg-gray-100 px-1 rounded">data/mo-stl-kc-open-data-import.csv</code>. Up to{" "}
                <strong>50,000</strong> LLC / large-building / multifamily-style rows (still{" "}
                <strong>no phones in source</strong>):{" "}
                <code className="text-xs bg-gray-100 px-1 rounded">npm run data:mo-commercial-50k</code> →{" "}
                <code className="text-xs bg-gray-100 px-1 rounded">data/mo-commercial-pm-candidates-50k.csv</code>{" "}
                (empty phone / contact / email columns for you to fill from a licensed list).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3 text-black">
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

          <Card className="text-black">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-black">
                <ClipboardPaste className="w-5 h-5" />
                Paste JSON
              </CardTitle>
              <CardDescription className="text-black">Single property object; clears the results table.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-black">
              <textarea
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono min-h-[100px] text-black placeholder:text-neutral-500"
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

        <Card className="text-black border-violet-200 bg-violet-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-black">
              <Sparkles className="w-5 h-5" />
              Parallel — bulk property / owner / PM enrichment
            </CardTitle>
            <CardDescription className="text-black">
              Run from <strong>Cursor</strong> (not inside this page). Example intent for B2B commercial roofing:{" "}
              <em>
                property mailing address; assessor-style owner LLC; main business phone; property manager company if
                visible; principal or registered-agent contact name
              </em>
              . Start with a CSV that has at least <code className="text-xs bg-white px-1 rounded">property_address</code>{" "}
              or company + city columns, then import the enriched file here.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-black space-y-3 bg-white/60 rounded-md border border-violet-100 p-4">
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                In Cursor, run <code className="text-xs bg-gray-100 px-1 rounded">/parallel-setup</code> once (installs{" "}
                <code className="text-xs bg-gray-100 px-1 rounded">parallel-cli</code>).
              </li>
              <li>
                Run <code className="text-xs bg-gray-100 px-1 rounded">/parallel-enrich</code> with a seed CSV (columns
                like property address and/or owner LLC) and an intent such as: owner entity name, main phone, property
                management company if visible, and decision-maker or registered-agent style contact for commercial roofing
                outreach.
              </li>
              <li>
                Poll to completion, then use <strong>Choose CSV</strong> above to import the enriched file (map headers to
                our template if needed).
              </li>
            </ol>
            <p className="text-xs text-neutral-600 font-mono break-all">
              parallel-cli enrich poll &quot;$TASKGROUP_ID&quot; --timeout 540
            </p>
          </CardContent>
        </Card>

        {commResults.length > 0 || preview ? (
          <div className="flex flex-wrap gap-2 items-center">
            <Button type="button" variant="secondary" size="sm" onClick={onDownloadCampaignCsv}>
              <FileDown className="w-4 h-4 mr-2" />
              {commResults.length > 0
                ? `Export outreach CSV (${commResults.length} rows)`
                : "Export outreach CSV (current preview)"}
            </Button>
            <span className="text-xs text-neutral-600">
              Spreadsheet / mail merge — same columns as the manual-research template.
            </span>
          </div>
        ) : null}

        {commResults.length > 0 ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              {!propertyScraperOffline ? (
                <>
                  <span className="text-sm font-medium text-black">Data enhancement (loaded rows)</span>
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
                    Places (up to {enrichLimit})
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
                    PDL (up to {pdlEnrichLimit})
                  </Button>
                  <span className="text-xs text-neutral-600">Skips rows that already have digits in Phone(s).</span>
                </>
              ) : (
                <span className="text-xs text-neutral-700">
                  CSV-only mode: add <code className="text-xs bg-gray-100 px-1 rounded">phone</code> / contact columns in
                  your spreadsheet, then re-import — or use manual FPS / clipboard merge below.
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-700">
              <strong>FastPeopleSearch</strong> (manual): open{" "}
              <a
                className="text-black underline"
                href={FAST_PEOPLE_SEARCH_HOME_LANG_EN}
                target="_blank"
                rel="noreferrer noopener"
              >
                fastpeoplesearch.com/?lang=en
              </a>{" "}
              or use the preview row for owner/address Google → FPS shortcuts.
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
          <Card className="text-black">
            <CardHeader>
              <CardTitle className="text-black">Preview</CardTitle>
              <CardDescription className="text-black">Source: {sourceLabel(preview.source)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-black">
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
                  <span className="font-medium block">Owner / company (deed or assessor)</span>
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
                  <span className="font-medium block">Phone(s) — main / company</span>
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
                <p className="text-xs whitespace-pre-wrap border-t border-gray-300 pt-3">{preview.notes}</p>
              ) : null}
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <p className="text-xs font-medium text-black">Manual data enhancement — FastPeopleSearch</p>
                <p className="text-xs text-neutral-600">
                  Opens new tabs only — this app does not request FastPeopleSearch servers.                   After you find a match, type the <strong>person&apos;s name</strong> below and/or copy a snippet with
                  their numbers, then <strong>Merge phones from clipboard</strong> (saved as contact person phone; company
                  lines stay in Phone(s)).
                  Lead score updates when numbers are added. Comply with FPS terms and privacy law.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={FAST_PEOPLE_SEARCH_HOME_LANG_EN} target="_blank" rel="noreferrer noopener">
                      <ExternalLink className="w-4 h-4" />
                      FPS home (?lang=en)
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
                          Google → FPS (owner + area)
                        </a>
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" size="sm" disabled title="Need owner name for this search">
                        <ExternalLink className="w-4 h-4" />
                        Google → FPS (owner + area)
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
                        Google → FPS (property address)
                      </a>
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" size="sm" disabled title="Need property address">
                      <ExternalLink className="w-4 h-4" />
                      Google → FPS (property address)
                    </Button>
                  )}
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                  <label className="text-xs flex-1 min-w-[220px]">
                    <span className="font-medium text-black block mb-1">Contact person name (from FPS)</span>
                    <input
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-black"
                      value={manualFpsOwnerName}
                      onChange={(e) => setManualFpsOwnerName(e.target.value)}
                      placeholder="Type what you see on FastPeopleSearch…"
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
                {!propertyScraperOffline ? (
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
                      Enhance: Places
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
                      Enhance: PDL
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
