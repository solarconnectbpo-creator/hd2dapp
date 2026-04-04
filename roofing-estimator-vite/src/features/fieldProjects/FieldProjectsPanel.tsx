import { useCallback, useRef, useState } from "react";
import {
  Camera,
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

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const selected = selectedId ? fieldProjects.find((p) => p.id === selectedId) : undefined;

  const sorted = [...fieldProjects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const onCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const p = addFieldProject({
      name,
      address: newAddress.trim() || undefined,
      notes: newNotes.trim() || undefined,
    });
    setNewName("");
    setNewAddress("");
    setNewNotes("");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Field jobs</h2>
          <p className="text-sm text-black/80">
            Take damage photos on your phone (camera opens on iOS/Android), track pipeline stages for roofing and
            insurance.
          </p>
        </div>
        <Button type="button" className="bg-black text-white hover:bg-black/90" onClick={() => setCreateOpen(true)}>
          New field project
        </Button>
      </div>

      {importError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {importError}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => setImportError(null)}
          >
            Dismiss
          </button>
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
        <div className="grid gap-4 sm:grid-cols-2">
          {sorted.map((p) => (
            <FieldProjectCard
              key={p.id}
              project={p}
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
              <CardDescription>Job name, optional site address and notes.</CardDescription>
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
                    <li
                      key={ph.id}
                      className="overflow-hidden rounded-lg border border-black/10 bg-white"
                    >
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
                          onChange={(e) =>
                            updateFieldProjectPhotoCaption(selected.id, ph.id, e.target.value)
                          }
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
                            {ph.aiSummary.notes ? (
                              <p className="mt-1 text-black/80">{ph.aiSummary.notes}</p>
                            ) : null}
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

function FieldProjectCard({
  project,
  onOpen,
  onDelete,
}: {
  project: FieldProject;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="border-black/10">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <CardDescription className="mt-1">
              {project.address ? <span className="block text-black/80">{project.address}</span> : null}
              {new Date(project.updatedAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0 border-black/20 bg-black/5 text-black">
            {fieldProjectStageLabel(project.pipelineStage)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2">
        <span className="text-sm text-black/80">
          {project.photos.length} photo{project.photos.length !== 1 ? "s" : ""}
        </span>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onOpen}>
            Open
          </Button>
          <Button type="button" size="sm" variant="outline" className="text-red-700" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
