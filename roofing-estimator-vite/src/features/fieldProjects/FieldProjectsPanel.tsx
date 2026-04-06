import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router";
import {
  Camera,
  ExternalLink,
  ImagePlus,
  LayoutGrid,
  List,
  Loader2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRoofing } from "../../context/RoofingContext";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import {
  FIELD_PROJECT_PIPELINE_STAGES,
  MAX_FIELD_PROJECT_PHOTOS,
  fieldProjectStageLabel,
  normalizeTagList,
  type FieldPipelineStage,
  type FieldProject,
} from "../../lib/fieldProjectTypes";
import { compressImageFileToJpegDataUrl, dataUrlToBase64Payload } from "../../lib/fieldPhotoCompress";
import { postRoofDamageDraft } from "../../lib/roofDamageClient";
import { loadOrgSettings } from "../../lib/orgSettings";

const DND_MIME = "application/x-hd2d-field-project-id";

/** Opaque fields on `canvass-light-sheet` modals (global `.text-black` maps to HD2D chrome). */
const FP_MODAL_FIELD =
  "mt-1 w-full rounded-md border border-black/20 bg-[#f3f4f6] px-3 py-2 text-black";
const FP_MODAL_SELECT =
  "w-full rounded-md border border-black/20 bg-[#f3f4f6] px-3 py-2 text-black";
const FP_MODAL_SELECT_PIPELINE =
  "ml-0 mt-1 block w-full rounded-md border border-black/20 bg-[#f3f4f6] px-3 py-2 text-black sm:ml-2 sm:mt-0 sm:inline-block sm:w-auto";
const FP_MODAL_INNER = "rounded-lg border border-black/10 bg-[#f1f5f9] p-3 space-y-3";

/** Light “paper” blocks — avoids global `.bg-white` → `--x-surface` remap on the dark app shell. */
const FP_PAPER = "canvass-paper rounded-2xl border border-[#e2e8f0] shadow-sm";
const FP_TOOLBAR_TOGGLE =
  "inline-flex rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-0.5 shadow-sm";
const FP_BTN_ACTIVE = "bg-[#0f172a] text-white shadow-sm";
const FP_BTN_IDLE = "text-[#475569] hover:bg-[#f1f5f9]";
const FP_PILL_ACTIVE = "border-[#1d9bf0] bg-[#1d9bf0] text-white shadow-[0_0_16px_rgba(29,155,240,0.2)]";
const FP_PILL_IDLE = "border-[#e2e8f0] bg-[#f8fafc] text-[#334155] hover:bg-[#f1f5f9]";
const FP_FIELD_LIGHT =
  "mt-1 w-full max-w-md rounded-lg border border-[#e2e8f0] bg-[#ffffff] px-3 py-2 text-sm text-[#0f172a] placeholder:text-[#94a3b8]";

const usdFmt = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatUsd(n: number): string {
  return usdFmt.format(n);
}

type ProjectsViewMode = "board" | "list";
type ListSortKey = "updated" | "name" | "value" | "stage";

function resolveGhlOpenUrl(project: FieldProject, ghlBaseUrl: string): string | null {
  const direct = project.ghlUrl?.trim();
  if (direct) return direct;
  const base = ghlBaseUrl.trim();
  if (!base) return null;
  try {
    const u = new URL(base);
    return u.protocol === "https:" ? base : null;
  } catch {
    return null;
  }
}

function resolveGhlEmbedUrl(project: FieldProject, ghlBaseUrl: string): string | null {
  const embed = project.ghlEmbedUrl?.trim();
  if (embed) return embed;
  const direct = project.ghlUrl?.trim();
  if (direct) return direct;
  const base = ghlBaseUrl.trim();
  try {
    return base && new URL(base).protocol === "https:" ? base : null;
  } catch {
    return null;
  }
}

function GhlEmbedPanel({ src, openFallbackUrl }: { src: string; openFallbackUrl: string }) {
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setTimedOut(false);
    const t = window.setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(t);
  }, [src]);

  const showSlowWarning = timedOut && !loaded;

  return (
    <div className="space-y-2 rounded-lg border border-black/15 bg-[#f1f5f9] p-3">
      <p className="text-xs text-black/70">
        Embedded CRM pages often fail here because many external systems send{" "}
        <code className="text-[11px]">X-Frame-Options: DENY</code>. If the frame stays blank, use{" "}
        <strong>Open in new tab</strong>.
      </p>
      <iframe
        title="External CRM"
        src={src}
        className="h-[min(420px,55vh)] w-full rounded-md border border-black/10 bg-[#ffffff]"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
        onLoad={() => setLoaded(true)}
      />
      {showSlowWarning ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          The frame is still empty after a few seconds — it may be blocked. Use open in new tab.
        </div>
      ) : null}
      <Button type="button" size="sm" variant="outline" asChild>
        <a href={openFallbackUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 h-4 w-4" />
          Open in new tab
        </a>
      </Button>
    </div>
  );
}

export function FieldProjectsPanel() {
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    fieldProjects,
    measurements,
    addFieldProject,
    deleteFieldProject,
    setFieldProjectPipelineStage,
    addFieldProjectPhoto,
    removeFieldProjectPhoto,
    updateFieldProjectPhotoCaption,
    setFieldProjectPhotoAiSummary,
    updateFieldProject,
  } = useRoofing();

  const org = loadOrgSettings();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newGhlUrl, setNewGhlUrl] = useState("");
  const [newGhlEmbedUrl, setNewGhlEmbedUrl] = useState("");
  const [newMonetaryStr, setNewMonetaryStr] = useState("");
  const [newOwnerLabel, setNewOwnerLabel] = useState("");
  const [newTagsComma, setNewTagsComma] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [boardQuery, setBoardQuery] = useState("");
  const [projectsView, setProjectsView] = useState<ProjectsViewMode>("list");
  const [stageFilter, setStageFilter] = useState<FieldPipelineStage | "all">("all");
  const [listSortKey, setListSortKey] = useState<ListSortKey>("updated");
  const [listSortDesc, setListSortDesc] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<FieldPipelineStage | null>(null);
  const [ghlEmbedOpen, setGhlEmbedOpen] = useState(false);
  const [detailGhlUrl, setDetailGhlUrl] = useState("");
  const [detailGhlEmbedUrl, setDetailGhlEmbedUrl] = useState("");
  const [detailMonetaryStr, setDetailMonetaryStr] = useState("");
  const [detailOwnerLabel, setDetailOwnerLabel] = useState("");
  const [detailTagsComma, setDetailTagsComma] = useState("");

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const selected = selectedId ? fieldProjects.find((p) => p.id === selectedId) : undefined;

  const modalLayerOpen = createOpen || Boolean(selectedId) || Boolean(lightboxUrl);

  useEffect(() => {
    if (!modalLayerOpen) return;
    const main = document.getElementById("main-content");
    const prevBody = document.body.style.overflow;
    const prevMain = main?.style.overflow ?? "";
    document.body.style.overflow = "hidden";
    if (main) main.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      if (main) main.style.overflow = prevMain;
    };
  }, [modalLayerOpen]);

  useEffect(() => {
    if (!modalLayerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (lightboxUrl) {
        setLightboxUrl(null);
        return;
      }
      if (createOpen) {
        setCreateOpen(false);
        return;
      }
      if (selectedId) setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalLayerOpen, lightboxUrl, createOpen, selectedId]);

  useEffect(() => {
    const openId = searchParams.get("openProject")?.trim();
    if (!openId) return;
    if (!fieldProjects.some((p) => p.id === openId)) return;
    setSelectedId(openId);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("openProject");
        return next;
      },
      { replace: true },
    );
  }, [searchParams, fieldProjects, setSearchParams]);

  useEffect(() => {
    if (!selected) {
      setGhlEmbedOpen(false);
      setDetailGhlUrl("");
      setDetailGhlEmbedUrl("");
      return;
    }
    setDetailGhlUrl(selected.ghlUrl ?? "");
    setDetailGhlEmbedUrl(selected.ghlEmbedUrl ?? "");
    setDetailMonetaryStr(
      selected.monetaryValueUsd != null && Number.isFinite(selected.monetaryValueUsd)
        ? String(selected.monetaryValueUsd)
        : "",
    );
    setDetailOwnerLabel(selected.ownerLabel ?? "");
    setDetailTagsComma(selected.tags?.length ? selected.tags.join(", ") : "");
    setGhlEmbedOpen(false);
  }, [
    selectedId,
    selected?.ghlUrl,
    selected?.ghlEmbedUrl,
    selected?.monetaryValueUsd,
    selected?.ownerLabel,
    selected ? selected.tags.join("\0") : "",
  ]);

  const sorted = useMemo(
    () => [...fieldProjects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [fieldProjects],
  );

  const filteredProjects = useMemo(() => {
    const q = boardQuery.trim().toLowerCase();
    let rows = sorted;
    if (q) {
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.address?.toLowerCase().includes(q) ?? false) ||
          (p.notes?.toLowerCase().includes(q) ?? false) ||
          (p.ownerLabel?.toLowerCase().includes(q) ?? false) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (stageFilter !== "all") {
      rows = rows.filter((p) => p.pipelineStage === stageFilter);
    }
    return rows;
  }, [sorted, boardQuery, stageFilter]);

  const stageCounts = useMemo(() => {
    const m = new Map<FieldPipelineStage, number>();
    for (const s of FIELD_PROJECT_PIPELINE_STAGES) m.set(s, 0);
    for (const p of fieldProjects) {
      m.set(p.pipelineStage, (m.get(p.pipelineStage) ?? 0) + 1);
    }
    return m;
  }, [fieldProjects]);

  const listSortedProjects = useMemo(() => {
    const rows = [...filteredProjects];
    const stageIdx = (s: FieldPipelineStage) => FIELD_PROJECT_PIPELINE_STAGES.indexOf(s);
    const dir = listSortDesc ? -1 : 1;
    rows.sort((a, b) => {
      let c = 0;
      switch (listSortKey) {
        case "name":
          c = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
          break;
        case "value": {
          const va = a.monetaryValueUsd ?? 0;
          const vb = b.monetaryValueUsd ?? 0;
          c = va === vb ? 0 : va < vb ? -1 : 1;
          break;
        }
        case "stage":
          c = stageIdx(a.pipelineStage) - stageIdx(b.pipelineStage);
          break;
        case "updated":
        default:
          c = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }
      if (c === 0) c = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      return c * dir;
    });
    return rows;
  }, [filteredProjects, listSortKey, listSortDesc]);

  const byStage = useMemo(() => {
    const m = new Map<FieldPipelineStage, FieldProject[]>();
    for (const s of FIELD_PROJECT_PIPELINE_STAGES) m.set(s, []);
    for (const p of filteredProjects) {
      const list = m.get(p.pipelineStage);
      if (list) list.push(p);
    }
    for (const s of FIELD_PROJECT_PIPELINE_STAGES) {
      m.set(
        s,
        (m.get(s) ?? []).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      );
    }
    return m;
  }, [filteredProjects]);

  const toggleListSort = (key: ListSortKey) => {
    if (listSortKey === key) setListSortDesc((d) => !d);
    else {
      setListSortKey(key);
      setListSortDesc(key === "name" ? false : true);
    }
  };

  const onCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const mvRaw = newMonetaryStr.trim();
    const monetaryParsed = mvRaw === "" ? undefined : Number.parseFloat(mvRaw);
    const p = addFieldProject({
      name,
      address: newAddress.trim() || undefined,
      notes: newNotes.trim() || undefined,
      ghlUrl: newGhlUrl.trim() || undefined,
      ghlEmbedUrl: newGhlEmbedUrl.trim() || undefined,
      ...(monetaryParsed != null && Number.isFinite(monetaryParsed) && monetaryParsed >= 0
        ? { monetaryValueUsd: monetaryParsed }
        : {}),
      ownerLabel: newOwnerLabel.trim() || undefined,
      tags: newTagsComma.trim() || undefined,
    });
    setNewName("");
    setNewAddress("");
    setNewNotes("");
    setNewGhlUrl("");
    setNewGhlEmbedUrl("");
    setNewMonetaryStr("");
    setNewOwnerLabel("");
    setNewTagsComma("");
    setCreateOpen(false);
    setSelectedId(p.id);
  };

  const handleFiles = useCallback(
    async (projectId: string, files: FileList | null) => {
      if (!files?.length) return;
      setImportError(null);
      const proj = fieldProjects.find((p) => p.id === projectId);
      let remaining = proj ? MAX_FIELD_PROJECT_PHOTOS - proj.photos.length : 0;
      if (remaining <= 0) {
        setImportError(`Each project allows at most ${MAX_FIELD_PROJECT_PHOTOS} photos (local storage limit).`);
        return;
      }
      for (let i = 0; i < files.length && remaining > 0; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;
        try {
          const dataUrl = await compressImageFileToJpegDataUrl(file);
          const ok = addFieldProjectPhoto(projectId, dataUrl);
          if (ok) remaining -= 1;
        } catch (e) {
          setImportError(e instanceof Error ? e.message : "Could not process an image.");
        }
      }
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    },
    [addFieldProjectPhoto, fieldProjects],
  );

  const runAiOnPhoto = async (projectId: string, photoId: string, imageDataUrl: string, contextHint: string) => {
    setBusyPhotoId(photoId);
    setImportError(null);
    try {
      const { base64, mimeType } = dataUrlToBase64Payload(imageDataUrl);
      const res = await postRoofDamageDraft({
        imageBase64: base64,
        mimeType,
        context: contextHint || undefined,
      });
      if (!res.ok) {
        setImportError(res.error);
        return;
      }
      setFieldProjectPhotoAiSummary(projectId, photoId, res.data);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setBusyPhotoId(null);
    }
  };

  const onColumnDragOver = (e: DragEvent, stage: FieldPipelineStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  };

  const onColumnDrop = (e: DragEvent, stage: FieldPipelineStage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData(DND_MIME) || e.dataTransfer.getData("text/plain");
    if (id) setFieldProjectPipelineStage(id, stage);
    setDraggingId(null);
    setDragOverStage(null);
  };

  const selectedOpenUrl = selected ? resolveGhlOpenUrl(selected, org.ghlBaseUrl) : null;
  const selectedEmbedSrc = selected ? resolveGhlEmbedUrl(selected, org.ghlBaseUrl) : null;

  const modalMount = typeof document !== "undefined" ? document.body : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Field jobs &amp; pipeline</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-[#71767b]">
            Opportunities-style <strong className="text-[#e7e9ea]">list</strong> or{" "}
            <strong className="text-[#e7e9ea]">board</strong> views (local CRM). Add deal value, owner, and tags;
            optionally link each job to your CRM. Photos and AI notes stay on device until you export.
          </p>
        </div>
        <Button
          type="button"
          className="shrink-0 bg-[#1d9bf0] text-white shadow-[0_0_24px_rgba(29,155,240,0.28)] hover:bg-[#1a8cd8]"
          onClick={() => setCreateOpen(true)}
        >
          New field project
        </Button>
      </div>

      {importError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {importError}
          <button type="button" className="ml-2 underline" onClick={() => setImportError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {sorted.length > 0 ? (
        <div className={`space-y-4 ${FP_PAPER} p-4 sm:p-5`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className={FP_TOOLBAR_TOGGLE}>
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  projectsView === "list" ? FP_BTN_ACTIVE : FP_BTN_IDLE
                }`}
                onClick={() => setProjectsView("list")}
              >
                <List className="h-4 w-4" />
                List
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  projectsView === "board" ? FP_BTN_ACTIVE : FP_BTN_IDLE
                }`}
                onClick={() => setProjectsView("board")}
              >
                <LayoutGrid className="h-4 w-4" />
                Board
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  stageFilter === "all" ? FP_PILL_ACTIVE : FP_PILL_IDLE
                }`}
                onClick={() => setStageFilter("all")}
              >
                All ({fieldProjects.length})
              </button>
              {FIELD_PROJECT_PIPELINE_STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    stageFilter === s ? FP_PILL_ACTIVE : FP_PILL_IDLE
                  }`}
                  onClick={() => setStageFilter(s)}
                >
                  {fieldProjectStageLabel(s)} ({stageCounts.get(s) ?? 0})
                </button>
              ))}
            </div>
          </div>
          <label className="block text-sm font-medium text-[#0f172a]">
            Search
            <input
              className={FP_FIELD_LIGHT}
              value={boardQuery}
              onChange={(e) => setBoardQuery(e.target.value)}
              placeholder="Name, address, owner, tags, notes…"
            />
          </label>
          {projectsView === "board" ? (
            <p className="text-xs text-[#64748b]">
              Drag-and-drop between columns on desktop; on phones use the pipeline dropdown inside a job.
            </p>
          ) : (
            <p className="text-xs text-[#64748b]">
              Click column headers to sort. Stage changes apply immediately from the dropdown.
            </p>
          )}
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <Card className="border-white/[0.08] bg-[#12141a] ring-1 ring-white/[0.04]">
          <CardContent className="flex flex-col items-center justify-center py-14">
            <Camera className="mb-3 h-14 w-14 text-[#1d9bf0]/80" />
            <p className="max-w-sm text-center text-sm leading-relaxed text-[#e7e9ea]">
              No field projects yet. Create one to add site photos and pipeline.
            </p>
          </CardContent>
        </Card>
      ) : projectsView === "list" ? (
        <div className={`${FP_PAPER} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm text-[#0f172a]">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                <th className="px-3 py-2.5">
                  <button
                    type="button"
                    className="font-semibold text-[#0f172a] hover:underline"
                    onClick={() => toggleListSort("name")}
                  >
                    Opportunity {listSortKey === "name" ? (listSortDesc ? "↓" : "↑") : ""}
                  </button>
                </th>
                <th className="px-3 py-2.5">
                  <button
                    type="button"
                    className="font-semibold text-[#0f172a] hover:underline"
                    onClick={() => toggleListSort("stage")}
                  >
                    Stage {listSortKey === "stage" ? (listSortDesc ? "↓" : "↑") : ""}
                  </button>
                </th>
                <th className="px-3 py-2.5">
                  <button
                    type="button"
                    className="font-semibold text-[#0f172a] hover:underline"
                    onClick={() => toggleListSort("value")}
                  >
                    Value {listSortKey === "value" ? (listSortDesc ? "↓" : "↑") : ""}
                  </button>
                </th>
                <th className="px-3 py-2.5 font-semibold text-[#0f172a]">Owner</th>
                <th className="px-3 py-2.5 font-semibold text-[#0f172a]">Tags</th>
                <th className="px-3 py-2.5 font-semibold text-[#0f172a]">Photos</th>
                <th className="px-3 py-2.5">
                  <button
                    type="button"
                    className="font-semibold text-[#0f172a] hover:underline"
                    onClick={() => toggleListSort("updated")}
                  >
                    Updated {listSortKey === "updated" ? (listSortDesc ? "↓" : "↑") : ""}
                  </button>
                </th>
                <th className="px-3 py-2.5 text-right font-semibold text-[#0f172a]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listSortedProjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-[#64748b]">
                    No jobs match this filter.
                  </td>
                </tr>
              ) : (
                listSortedProjects.map((p) => (
                  <tr key={p.id} className="border-b border-[#e2e8f0] hover:bg-[#f8fafc]">
                    <td className="max-w-[200px] px-3 py-2 align-top">
                      <p className="font-medium leading-snug text-[#0f172a]">{p.name}</p>
                      {p.address ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-[#64748b]">{p.address}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <select
                        className="max-w-[140px] rounded-md border border-[#e2e8f0] bg-[#ffffff] px-2 py-1 text-xs text-[#0f172a]"
                        value={p.pipelineStage}
                        onChange={(e) =>
                          setFieldProjectPipelineStage(p.id, e.target.value as FieldPipelineStage)
                        }
                      >
                        {FIELD_PROJECT_PIPELINE_STAGES.map((s) => (
                          <option key={s} value={s}>
                            {fieldProjectStageLabel(s)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-[#0f172a]">
                      {p.monetaryValueUsd != null ? formatUsd(p.monetaryValueUsd) : "—"}
                    </td>
                    <td className="max-w-[120px] px-3 py-2 align-top text-xs text-[#334155]">
                      {p.ownerLabel ?? "—"}
                    </td>
                    <td className="max-w-[160px] px-3 py-2 align-top">
                      <div className="flex flex-wrap gap-1">
                        {p.tags.length ? (
                          p.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[10px] font-medium text-[#475569]"
                            >
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[#94a3b8]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-[#0f172a]">{p.photos.length}</td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-xs text-[#64748b]">
                      {new Date(p.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 align-top text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 border-[#e2e8f0] bg-[#ffffff] text-xs text-[#0f172a] hover:bg-[#f8fafc]"
                          onClick={() => setSelectedId(p.id)}
                        >
                          Open
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (window.confirm(`Delete field project “${p.name}” and all its photos?`)) {
                              deleteFieldProject(p.id);
                              if (selectedId === p.id) setSelectedId(null);
                            }
                          }}
                        >
                          Del
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        <div className={`${FP_PAPER} p-4 sm:p-5`}>
        <div className="overflow-x-auto pb-2">
          <div className="flex min-h-[min(480px,70vh)] gap-3" style={{ minWidth: "min(100%, 920px)" }}>
            {FIELD_PROJECT_PIPELINE_STAGES.map((stage) => {
              const column = byStage.get(stage) ?? [];
              const isOver = dragOverStage === stage;
              return (
                <div
                  key={stage}
                  className={`flex min-w-[200px] flex-1 flex-col rounded-xl border shadow-sm ${
                    isOver
                      ? "border-[#1d9bf0] bg-[#f0f9ff] ring-2 ring-[#1d9bf0]/25"
                      : "border-[#e2e8f0] bg-[#f8fafc]"
                  }`}
                  onDragOver={(e) => onColumnDragOver(e, stage)}
                  onDragLeave={() => setDragOverStage((cur) => (cur === stage ? null : cur))}
                  onDrop={(e) => onColumnDrop(e, stage)}
                >
                  <div className="border-b border-[#e2e8f0] px-2 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                      {fieldProjectStageLabel(stage)}
                    </p>
                    <p className="text-[11px] text-[#94a3b8]">{column.length} job{column.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-2">
                    {column.map((p) => (
                      <KanbanCard
                        key={p.id}
                        project={p}
                        dragging={draggingId === p.id}
                        onDragStart={(e) => {
                          e.dataTransfer.setData(DND_MIME, p.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDraggingId(p.id);
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverStage(null);
                        }}
                        onOpen={() => setSelectedId(p.id)}
                        onDelete={() => {
                          if (window.confirm(`Delete field project “${p.name}” and all its photos?`)) {
                            deleteFieldProject(p.id);
                            if (selectedId === p.id) setSelectedId(null);
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      )}

      {createOpen && modalMount
        ? createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overflow-x-hidden overscroll-y-contain bg-black/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fp-create-title"
          onClick={() => setCreateOpen(false)}
        >
          <Card
            className="canvass-light-sheet relative my-auto w-full max-w-md min-h-0 max-h-[min(100dvh-2rem,920px)] flex flex-col gap-0 overflow-hidden border border-black/10 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 z-10 rounded p-1 text-black/60 hover:bg-black/5"
              aria-label="Close"
              onClick={() => setCreateOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <CardHeader className="shrink-0 border-b border-black/10">
              <CardTitle id="fp-create-title">New field project</CardTitle>
              <CardDescription>Job name, optional site address, notes, and optional CRM links.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain pt-6">
              <label className="block text-sm font-medium text-black">
                Project name *
                <input
                  className={FP_MODAL_FIELD}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. 123 Oak — hail inspection"
                />
              </label>
              <label className="block text-sm font-medium text-black">
                Address (optional)
                <input
                  className={FP_MODAL_FIELD}
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Street, city, state"
                />
              </label>
              <label className="block text-sm font-medium text-black">
                Notes (optional)
                <textarea
                  className={FP_MODAL_FIELD}
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Claim #, adjuster, access notes…"
                />
              </label>
              <label className="block text-sm font-medium text-black">
                Deal value USD (optional)
                <input
                  type="number"
                  min={0}
                  step={1}
                  className={FP_MODAL_FIELD}
                  value={newMonetaryStr}
                  onChange={(e) => setNewMonetaryStr(e.target.value)}
                  placeholder="e.g. 45000"
                />
              </label>
              <label className="block text-sm font-medium text-black">
                Owner / assignee (optional)
                <input
                  className={FP_MODAL_FIELD}
                  value={newOwnerLabel}
                  onChange={(e) => setNewOwnerLabel(e.target.value)}
                  placeholder="Rep or crew lead"
                />
              </label>
              <label className="block text-sm font-medium text-black">
                Tags (optional, comma-separated)
                <input
                  className={FP_MODAL_FIELD}
                  value={newTagsComma}
                  onChange={(e) => setNewTagsComma(e.target.value)}
                  placeholder="hail, insurance, commercial"
                />
              </label>
              <label className="block text-sm font-medium text-black">
                CRM job link (optional, https)
                <input
                  className={FP_MODAL_FIELD}
                  value={newGhlUrl}
                  onChange={(e) => setNewGhlUrl(e.target.value)}
                  placeholder="https://…"
                />
              </label>
              <label className="block text-sm font-medium text-black">
                CRM embed URL (optional)
                <input
                  className={FP_MODAL_FIELD}
                  value={newGhlEmbedUrl}
                  onChange={(e) => setNewGhlEmbedUrl(e.target.value)}
                  placeholder="Often same as deep link; some dashboards allow iframes"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" disabled={!newName.trim()} onClick={onCreate}>
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>,
            modalMount,
          )
        : null}

      {selected && modalMount
        ? createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overflow-x-hidden overscroll-y-contain bg-black/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fp-detail-title"
          onClick={() => setSelectedId(null)}
        >
          <Card
            className="canvass-light-sheet relative my-4 w-full max-w-3xl border border-black/10 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 z-10 rounded p-1 text-black/60 hover:bg-black/5"
              aria-label="Close"
              onClick={() => setSelectedId(null)}
            >
              <X className="h-5 w-5" />
            </button>
            <CardHeader>
              <CardTitle id="fp-detail-title">{selected.name}</CardTitle>
              <CardDescription>
                {selected.address ? <span className="block text-black">{selected.address}</span> : null}
                Updated {new Date(selected.updatedAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <label className="text-sm font-medium text-black">
                  Pipeline stage
                  <select
                    className={FP_MODAL_SELECT_PIPELINE}
                    value={selected.pipelineStage}
                    onChange={(e) =>
                      setFieldProjectPipelineStage(selected.id, e.target.value as FieldPipelineStage)
                    }
                  >
                    {FIELD_PROJECT_PIPELINE_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {fieldProjectStageLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={FP_MODAL_INNER}>
                <p className="text-sm font-medium text-black">Deal fields</p>
                <label className="block text-sm text-black">
                  Value (USD)
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={FP_MODAL_FIELD}
                    value={detailMonetaryStr}
                    onChange={(e) => setDetailMonetaryStr(e.target.value)}
                    placeholder="Leave empty to clear"
                  />
                </label>
                <label className="block text-sm text-black">
                  Owner / assignee
                  <input
                    className={FP_MODAL_FIELD}
                    value={detailOwnerLabel}
                    onChange={(e) => setDetailOwnerLabel(e.target.value)}
                  />
                </label>
                <label className="block text-sm text-black">
                  Tags (comma-separated)
                  <input
                    className={FP_MODAL_FIELD}
                    value={detailTagsComma}
                    onChange={(e) => setDetailTagsComma(e.target.value)}
                  />
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const mvRaw = detailMonetaryStr.trim();
                    const monetaryValueUsd =
                      mvRaw === "" ? null : Number.parseFloat(mvRaw);
                    updateFieldProject(selected.id, {
                      monetaryValueUsd:
                        monetaryValueUsd != null && Number.isFinite(monetaryValueUsd) && monetaryValueUsd >= 0
                          ? monetaryValueUsd
                          : null,
                      ownerLabel: detailOwnerLabel.trim() === "" ? null : detailOwnerLabel,
                      tags: normalizeTagList(detailTagsComma),
                    });
                  }}
                >
                  Save deal fields
                </Button>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">Link to measurement (optional)</label>
                <select
                  className={FP_MODAL_SELECT}
                  value={selected.linkedMeasurementId ?? ""}
                  onChange={(e) =>
                    updateFieldProject(selected.id, {
                      linkedMeasurementId: e.target.value || null,
                    })
                  }
                >
                  <option value="">— None —</option>
                  {measurements.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.projectName} ({m.date})
                    </option>
                  ))}
                </select>
              </div>

              <div className={FP_MODAL_INNER}>
                <p className="text-sm font-medium text-black">CRM</p>
                <label className="block text-sm text-black">
                  Job deep link (https)
                  <input
                    className={FP_MODAL_FIELD}
                    value={detailGhlUrl}
                    onChange={(e) => setDetailGhlUrl(e.target.value)}
                    placeholder="https://…"
                  />
                </label>
                <label className="block text-sm text-black">
                  Embed URL (optional)
                  <input
                    className={FP_MODAL_FIELD}
                    value={detailGhlEmbedUrl}
                    onChange={(e) => setDetailGhlEmbedUrl(e.target.value)}
                    placeholder="Leave empty to use deep link for embed attempts"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      updateFieldProject(selected.id, { ghlUrl: detailGhlUrl, ghlEmbedUrl: detailGhlEmbedUrl });
                    }}
                  >
                    Save CRM links
                  </Button>
                  {selectedOpenUrl ? (
                    <Button type="button" size="sm" asChild>
                      <a href={selectedOpenUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open in CRM
                      </a>
                    </Button>
                  ) : (
                    <p className="text-xs text-black/60 self-center">
                      Set a job link or add a base URL under Contacts &amp; settings → CRM.
                    </p>
                  )}
                </div>
                {selectedEmbedSrc ? (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setGhlEmbedOpen((v) => !v)}
                    >
                      {ghlEmbedOpen ? "Hide embedded view" : "Try embedded view"}
                    </Button>
                    {ghlEmbedOpen ? (
                      <GhlEmbedPanel src={selectedEmbedSrc} openFallbackUrl={selectedOpenUrl ?? selectedEmbedSrc} />
                    ) : null}
                  </div>
                ) : null}
              </div>

              {selected.notes ? (
                <p className="text-sm text-black">
                  <strong>Notes:</strong> {selected.notes}
                </p>
              ) : null}

              <div>
                <p className="mb-2 text-sm font-medium text-black">
                  Damage photos ({selected.photos.length}/{MAX_FIELD_PROJECT_PHOTOS})
                </p>
                <p className="mb-3 text-xs text-black/70">
                  Photos are resized on device before save to fit browser storage. Use rear camera on site when
                  possible.
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => void handleFiles(selected.id, e.target.files)}
                  />
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => void handleFiles(selected.id, e.target.files)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={selected.photos.length >= MAX_FIELD_PROJECT_PHOTOS}
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Take photo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={selected.photos.length >= MAX_FIELD_PROJECT_PHOTOS}
                    onClick={() => galleryInputRef.current?.click()}
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Choose photos
                  </Button>
                </div>
              </div>

              {selected.photos.length === 0 ? (
                <p className="text-center text-sm text-black/60 py-6">No photos yet.</p>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {selected.photos.map((ph) => (
                    <li key={ph.id} className="overflow-hidden rounded-lg border border-black/10 bg-[#f8fafc]">
                      <button
                        type="button"
                        className="block w-full focus:outline-none focus:ring-2 focus:ring-black/20"
                        onClick={() => setLightboxUrl(ph.imageDataUrl)}
                      >
                        <img
                          src={ph.imageDataUrl}
                          alt={ph.caption || "Damage photo"}
                          className="h-40 w-full object-cover"
                        />
                      </button>
                      <div className="space-y-2 p-2">
                        <input
                          className="w-full rounded border border-black/15 bg-[#f3f4f6] px-2 py-1 text-sm text-black"
                          placeholder="Caption"
                          value={ph.caption ?? ""}
                          onChange={(e) => updateFieldProjectPhotoCaption(selected.id, ph.id, e.target.value)}
                        />
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            disabled={busyPhotoId === ph.id}
                            onClick={() =>
                              void runAiOnPhoto(
                                selected.id,
                                ph.id,
                                ph.imageDataUrl,
                                [selected.name, selected.address, ph.caption].filter(Boolean).join(" — "),
                              )
                            }
                          >
                            {busyPhotoId === ph.id ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="mr-1 h-3 w-3" />
                            )}
                            Draft damage notes (AI)
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs text-red-700"
                            onClick={() => removeFieldProjectPhoto(selected.id, ph.id)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Remove
                          </Button>
                        </div>
                        {ph.aiSummary ? (
                          <div className="rounded bg-black/5 p-2 text-xs text-black">
                            <p className="font-semibold">{ph.aiSummary.summary}</p>
                            <p className="mt-1">Types: {ph.aiSummary.damageTypes.join(", ") || "—"}</p>
                            <p>
                              Severity: {ph.aiSummary.severity}/5 · Action: {ph.aiSummary.recommendedAction}
                            </p>
                            {ph.aiSummary.notes ? <p className="mt-1 text-black/80">{ph.aiSummary.notes}</p> : null}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex justify-between border-t border-black/10 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="text-red-700"
                  onClick={() => {
                    if (window.confirm(`Delete “${selected.name}”?`)) {
                      deleteFieldProject(selected.id);
                      setSelectedId(null);
                    }
                  }}
                >
                  Delete project
                </Button>
                <Button type="button" onClick={() => setSelectedId(null)}>
                  Done
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>,
            modalMount,
          )
        : null}

      {lightboxUrl && modalMount
        ? createPortal(
            <div
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4"
              role="presentation"
              onClick={() => setLightboxUrl(null)}
            >
              <img
                src={lightboxUrl}
                alt="Full size"
                className="max-h-full max-w-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>,
            modalMount,
          )
        : null}
    </div>
  );
}

function KanbanCard({
  project,
  dragging,
  onDragStart,
  onDragEnd,
  onOpen,
  onDelete,
}: {
  project: FieldProject;
  dragging: boolean;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`cursor-grab border-[#e2e8f0] bg-[#ffffff] shadow-sm active:cursor-grabbing ${dragging ? "opacity-60" : ""}`}
    >
      <CardHeader className="space-y-1 p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug text-[#0f172a]">{project.name}</CardTitle>
          <Badge
            variant="outline"
            className="shrink-0 border-[#e2e8f0] bg-[#f8fafc] text-[10px] text-[#475569]"
          >
            {fieldProjectStageLabel(project.pipelineStage)}
          </Badge>
        </div>
        {project.address ? (
          <CardDescription className="line-clamp-2 text-xs text-[#64748b]">{project.address}</CardDescription>
        ) : null}
        {project.monetaryValueUsd != null ? (
          <p className="text-xs font-semibold text-emerald-800">{formatUsd(project.monetaryValueUsd)}</p>
        ) : null}
        {project.ownerLabel ? (
          <p className="text-[11px] text-[#64748b]">Owner: {project.ownerLabel}</p>
        ) : null}
        {project.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {project.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#64748b]"
              >
                {t}
              </span>
            ))}
            {project.tags.length > 4 ? (
              <span className="text-[9px] text-[#94a3b8]">+{project.tags.length - 4}</span>
            ) : null}
          </div>
        ) : null}
        <p className="text-[11px] text-[#94a3b8]">{new Date(project.updatedAt).toLocaleDateString()}</p>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2 px-3 pb-3 pt-0">
        <span className="text-xs text-[#475569]">
          {project.photos.length} photo{project.photos.length !== 1 ? "s" : ""}
        </span>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-[#e2e8f0] bg-[#ffffff] text-xs text-[#0f172a] hover:bg-[#f8fafc]"
            onClick={onOpen}
          >
            Open
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs text-red-700 hover:bg-red-50"
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
