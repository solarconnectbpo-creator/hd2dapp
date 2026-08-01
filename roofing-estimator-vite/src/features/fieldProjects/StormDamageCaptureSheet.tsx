import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Camera, ExternalLink, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { MAX_FIELD_PROJECT_PHOTOS, type FieldProject } from "../../lib/fieldProjectTypes";
import { FieldPhotoTile } from "./FieldPhotoTile";

type Props = {
  project: FieldProject;
  open: boolean;
  onClose: () => void;
  onOpenFullJob: () => void;
  openCamera: () => void;
  openGallery: () => void;
  importing: boolean;
  importError: string | null;
  onDismissError: () => void;
  busyPhotoId: string | null;
  autoAi: boolean;
  onAutoAiChange: (v: boolean) => void;
  canUseAi: boolean;
  onCaptionChange: (photoId: string, caption: string) => void;
  onRunAi: (photoId: string, imageDataUrl: string) => void;
  onRemovePhoto: (photoId: string) => void;
  onOpenLightbox: (url: string) => void;
};

/**
 * In-canvass storm damage documentation: take photos with the rear camera,
 * attach to the field job, optional AI drafts — without leaving the map.
 */
export function StormDamageCaptureSheet({
  project,
  open,
  onClose,
  onOpenFullJob,
  openCamera,
  openGallery,
  importing,
  importError,
  onDismissError,
  busyPhotoId,
  autoAi,
  onAutoAiChange,
  canUseAi,
  onCaptionChange,
  onRunAi,
  onRemovePhoto,
  onOpenLightbox,
}: Props) {
  const mount =
    typeof document !== "undefined" ? document.getElementById("root") ?? document.body : null;

  const atCap = project.photos.length >= MAX_FIELD_PROJECT_PHOTOS;
  const recentPhotos = useMemo(
    () => [...project.photos].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)).slice(0, 6),
    [project.photos],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mount) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="storm-damage-sheet-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Close damage report"
        onClick={onClose}
      />
      <div className="relative z-[1] flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[#e2e8f0] bg-[#f8fafc] shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#e2e8f0] bg-white px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
              Storm damage report
            </p>
            <h2 id="storm-damage-sheet-title" className="truncate text-base font-semibold text-[#0f172a]">
              {project.name}
            </h2>
            {project.address ? (
              <p className="mt-0.5 truncate text-xs text-[#64748b]">{project.address}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <p className="text-sm leading-relaxed text-[#475569]">
            Use the rear camera for site photos. Images are compressed on-device and saved to this field
            job ({project.photos.length}/{MAX_FIELD_PROJECT_PHOTOS}).
          </p>

          {importError ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {importError}
              <button type="button" className="ml-2 underline" onClick={onDismissError}>
                Dismiss
              </button>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              size="lg"
              className="w-full gap-2 bg-zinc-900 font-semibold text-white hover:bg-zinc-800"
              disabled={atCap || importing}
              onClick={openCamera}
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              Take photo
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full gap-2 border-zinc-300 font-semibold text-zinc-950"
              disabled={atCap || importing}
              onClick={openGallery}
            >
              <ImagePlus className="h-4 w-4" />
              Gallery
            </Button>
          </div>

          <label className="flex items-start gap-2 text-xs text-[#475569]">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={autoAi}
              disabled={!canUseAi}
              onChange={(e) => onAutoAiChange(e.target.checked)}
            />
            <span>
              Auto-draft damage notes with AI after each photo
              {!canUseAi ? " (sign in required)" : ""}
            </span>
          </label>

          {recentPhotos.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#cbd5e1] bg-white px-4 py-8 text-center text-sm text-[#64748b]">
              No photos yet — tap Take photo to open the camera.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {recentPhotos.map((ph) => (
                <FieldPhotoTile
                  key={ph.id}
                  photo={ph}
                  aiBusy={busyPhotoId === ph.id}
                  onOpenLightbox={onOpenLightbox}
                  onCaptionChange={(caption) => onCaptionChange(ph.id, caption)}
                  onRunAi={(imageDataUrl) => onRunAi(ph.id, imageDataUrl)}
                  onRemove={() => onRemovePhoto(ph.id)}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-[#e2e8f0] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 border-zinc-300 font-semibold"
            onClick={onOpenFullJob}
          >
            <ExternalLink className="h-4 w-4" />
            Open full job
          </Button>
          <Button
            type="button"
            className="w-full bg-[#1d9bf0] font-semibold text-white hover:bg-[#1a8cd8]"
            onClick={onClose}
          >
            Done — stay on map
          </Button>
        </div>
      </div>
    </div>,
    mount,
  );
}
