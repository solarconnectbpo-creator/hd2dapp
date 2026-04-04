import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  Camera,
  ExternalLink,
  ImagePlus,
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
  type FieldPipelineStage,
  type FieldProject,
} from "../../lib/fieldProjectTypes";
import { compressImageFileToJpegDataUrl, dataUrlToBase64Payload } from "../../lib/fieldPhotoCompress";
import { postRoofDamageDraft } from "../../lib/roofDamageClient";
import { loadOrgSettings } from "../../lib/orgSettings";

const DND_MIME = "application/x-hd2d-field-project-id";

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
    <div className="space-y-2 rounded-lg border border-black/15 bg-black/[0.02] p-3">
      <p className="text-xs text-black/70">
        Embedded GoHighLevel often fails here because many GHL pages send{" "}
        <code className="text-[11px]">X-Frame-Options: DENY</code>. If the frame stays blank, use{" "}
        <strong>Open in new tab</strong>.
      </p>
      <iframe
        title="GoHighLevel"
        src={src}
        className="h-[min(420px,55vh)] w-full rounded-md border border-black/10 bg-white"
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [boardQuery, setBoardQuery] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<FieldPipelineStage | null>(null);
  const [ghlEmbedOpen, setGhlEmbedOpen] = useState(false);
  const [detailGhlUrl, setDetailGhlUrl] = useState("");
  const [detailGhlEmbedUrl, setDetailGhlEmbedUrl] = useState("");

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const selected = selectedId ? fieldProjects.find((p) => p.id === selectedId) : undefined;

  useEffect(() => {
    if (!selected) {
      setGhlEmbedOpen(false);
      setDetailGhlUrl("");
      setDetailGhlEmbedUrl("");
      return;
    }
    setDetailGhlUrl(selected.ghlUrl ?? "");
    setDetailGhlEmbedUrl(selected.ghlEmbedUrl ?? "");
    setGhlEmbedOpen(false);
  }, [selected?.id, selected?.ghlUrl, selected?.ghlEmbedUrl]);

  const sorted = useMemo(
    () => [...fieldProjects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [fieldProjects],
  );

  const boardProjects = useMemo(() => {
    const q = boardQuery.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.address?.toLowerCase().includes(q) ?? false) ||
        (p.notes?.toLowerCase().includes(q) ?? false),
    );
  }, [sorted, boardQuery]);

  const byStage = useMemo(() => {
    const m = new Map<FieldPipelineStage, FieldProject[]>();
    for (const s of FIELD_PROJECT_PIPELINE_STAGES) m.set(s, []);
    for (const p of boardProjects) {
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
  }, [boardProjects]);

  const onCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const p = addFieldProject({
      name,
      address: newAddress.trim() || undefined,
      notes: newNotes.trim() || undefined,
      ghlUrl: newGhlUrl.trim() || undefined,
      ghlEmbedUrl: newGhlEmbedUrl.trim() || undefined,
    });
    setNewName("");
    setNewAddress("");
    setNewNotes("");
    setNewGhlUrl("");
    setNewGhlEmbedUrl("");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Field jobs</h2>
          <p className="text-sm text-black/80">
            Take damage photos on your phone (camera opens on iOS/Android), track pipeline stages for roofing and
            insurance. Drag cards between columns or open a job for details.
          </p>
        </div>
        <Button type="button" className="bg-black text-white hover:bg-black/90" onClick={() => setCreateOpen(true)}>
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
        <div className="space-y-2">
          <label className="block text-sm font-medium text-black">
            Search / filter
            <input
              className="mt-1 w-full max-w-md rounded-md border border-black/20 px-3 py-2 text-black"
              value={boardQuery}
              onChange={(e) => setBoardQuery(e.target.value)}
              placeholder="Name, address, or notes"
            />
          </label>
          <p className="text-xs text-black/60">
            Drag-and-drop works on desktop; on phones use the pipeline dropdown inside a job.
          </p>
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14">
            <Camera className="mb-3 h-14 w-14 text-black/40" />
            <p className="text-center text-black">No field projects yet. Create one to add site photos and pipeline.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-h-[min(480px,70vh)] gap-3" style={{ minWidth: "min(100%, 920px)" }}>
            {FIELD_PROJECT_PIPELINE_STAGES.map((stage) => {
              const column = byStage.get(stage) ?? [];
              const isOver = dragOverStage === stage;
              return (
                <div
                  key={stage}
                  className={`flex min-w-[200px] flex-1 flex-col rounded-lg border bg-white/80 ${
                    isOver ? "border-black ring-2 ring-black/20" : "border-black/10"
                  }`}
                  onDragOver={(e) => onColumnDragOver(e, stage)}
                  onDragLeave={() => setDragOverStage((cur) => (cur === stage ? null : cur))}
                  onDrop={(e) => onColumnDrop(e, stage)}
                >
                  <div className="border-b border-black/10 px-2 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-black/70">
                      {fieldProjectStageLabel(stage)}
                    </p>
                    <p className="text-[11px] text-black/50">{column.length} job{column.length !== 1 ? "s" : ""}</p>
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
      )}

      {createOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fp-create-title"
        >
          <Card className="relative w-full max-w-md border border-black/10 shadow-lg">
            <button
              type="button"
              className="absolute right-3 top-3 rounded p-1 text-black/60 hover:bg-black/5"
              aria-label="Close"
              onClick={() => setCreateOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <CardHeader>
              <CardTitle id="fp-create-title">New field project</CardTitle>
              <CardDescription>Job name, optional site address, notes, and GoHighLevel links.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block text-sm font-medium text-black">
                Project name *
                <input
                  className="mt-1 w-full rounded-md border border-black/20 px-3 py-2 text-black"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. 123 Oak — hail inspection"
                />
              </label>
              <label className="block text-sm font-medium text-black">
                Address (optional)
                <input
                  className="mt-1 w-full rounded-md border border-black/20 px-3 py-2 text-black"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Street, city, state"
                />
              </label>
              <label className="block text-sm font-medium text-black">
                Notes (optional)
                <textarea
                  className="mt-1 w-full rounded-md border border-black/20 px-3 py-2 text-black"
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Claim #, adjuster, access notes…"
                />
              </label>
              <label className="block text-sm font-medium text-black">
                GHL deep link (optional, https)
                <input
                  className="mt-1 w-full rounded-md border border-black/20 px-3 py-2 text-black"
                  value={newGhlUrl}
                  onChange={(e) => setNewGhlUrl(e.target.value)}
                  placeholder="https://app.gohighlevel.com/…"
                />
              </label>
              <label className="block text-sm font-medium text-black">
                GHL embed URL (optional)
                <input
                  className="mt-1 w-full rounded-md border border-black/20 px-3 py-2 text-black"
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
        </div>
      ) : null}

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fp-detail-title"
        >
          <Card className="relative my-4 w-full max-w-3xl border border-black/10 shadow-lg">
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
                    className="ml-0 mt-1 block w-full rounded-md border border-black/20 px-3 py-2 text-black sm:ml-2 sm:mt-0 sm:inline-block sm:w-auto"
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

              <div>
                <label className="mb-1 block text-sm font-medium text-black">Link to measurement (optional)</label>
                <select
                  className="w-full rounded-md border border-black/20 px-3 py-2 text-black"
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

              <div className="rounded-lg border border-black/10 bg-black/[0.02] p-3 space-y-3">
                <p className="text-sm font-medium text-black">GoHighLevel</p>
                <label className="block text-sm text-black">
                  Job deep link (https)
                  <input
                    className="mt-1 w-full rounded-md border border-black/20 px-3 py-2 text-black"
                    value={detailGhlUrl}
                    onChange={(e) => setDetailGhlUrl(e.target.value)}
                    placeholder="https://app.gohighlevel.com/…"
                  />
                </label>
                <label className="block text-sm text-black">
                  Embed URL (optional)
                  <input
                    className="mt-1 w-full rounded-md border border-black/20 px-3 py-2 text-black"
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
                    Save GHL URLs
                  </Button>
                  {selectedOpenUrl ? (
                    <Button type="button" size="sm" asChild>
                      <a href={selectedOpenUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open in GHL
                      </a>
                    </Button>
                  ) : (
                    <p className="text-xs text-black/60 self-center">
                      Set a job link or add a base URL under Company settings → GoHighLevel.
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
                    <li key={ph.id} className="overflow-hidden rounded-lg border border-black/10 bg-white">
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
                          className="w-full rounded border border-black/15 px-2 py-1 text-sm text-black"
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
        </div>
      ) : null}

      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          role="presentation"
          onClick={() => setLightboxUrl(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLightboxUrl(null);
          }}
        >
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
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
      className={`cursor-grab border-black/10 active:cursor-grabbing ${dragging ? "opacity-60" : ""}`}
    >
      <CardHeader className="space-y-1 p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{project.name}</CardTitle>
          <Badge variant="outline" className="shrink-0 border-black/20 bg-black/5 text-[10px] text-black">
            {fieldProjectStageLabel(project.pipelineStage)}
          </Badge>
        </div>
        {project.address ? (
          <CardDescription className="line-clamp-2 text-xs text-black/75">{project.address}</CardDescription>
        ) : null}
        <p className="text-[11px] text-black/50">{new Date(project.updatedAt).toLocaleDateString()}</p>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2 px-3 pb-3 pt-0">
        <span className="text-xs text-black/80">
          {project.photos.length} photo{project.photos.length !== 1 ? "s" : ""}
        </span>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={onOpen}>
            Open
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-8 text-xs text-red-700" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
