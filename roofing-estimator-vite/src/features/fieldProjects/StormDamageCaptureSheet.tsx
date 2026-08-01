import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Camera, Check, ExternalLink, ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { MAX_FIELD_PROJECT_PHOTOS, type DamagePhoto, type FieldProject } from "../../lib/fieldProjectTypes";
import { useRemotePhotoUrl } from "./useRemotePhotoUrl";

type Props = {
  project: FieldProject;
  open: boolean;
  onClose: () => void;
  onOpenFullJob: () => void;
  openCamera: () => void;
  openGallery: () => void;
  importing: boolean;
  analyzing: boolean;
  importError: string | null;
  onDismissError: () => void;
  keepShooting: boolean;
  onKeepShootingChange: (v: boolean) => void;
  canUseAi: boolean;
  onRemovePhoto: (photoId: string) => void;
  onOpenLightbox: (url: string) => void;
};

function Thumb({
  photo,
  analyzing,
  onOpen,
  onRemove,
}: {
  photo: DamagePhoto;
  analyzing: boolean;
  onOpen: (url: string) => void;
  onRemove: () => void;
}) {
  const src = useRemotePhotoUrl(photo);
  return (
    <li className="relative overflow-hidden rounded-xl bg-[#0f172a]/10">
      {src ? (
        <button type="button" className="block w-full" onClick={() => onOpen(src)}>
          <img src={src} alt={photo.caption || "Site photo"} className="h-20 w-full object-cover" />
        </button>
      ) : (
        <div className="flex h-20 items-center justify-center text-[10px] text-[#64748b]">Saving…</div>
      )}
      {analyzing ? (
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/55 py-0.5 text-[10px] text-white">
          <Loader2 className="h-3 w-3 animate-spin" /> AI
        </span>
      ) : null}
      <button
        type="button"
        className="absolute right-1 top-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] text-white"
        onClick={onRemove}
        aria-label="Remove photo"
      >
        ✕
      </button>
    </li>
  );
}

/**
 * In-canvass storm damage documentation: continuous rear-camera capture,
 * durable photo save, and a live AI report — without leaving the map.
 */
export function StormDamageCaptureSheet({
  project,
  open,
  onClose,
  onOpenFullJob,
  openCamera,
  openGallery,
  importing,
  analyzing,
  importError,
  onDismissError,
  keepShooting,
  onKeepShootingChange,
  canUseAi,
  onRemovePhoto,
  onOpenLightbox,
}: Props) {
  const mount =
    typeof document !== "undefined" ? document.getElementById("root") ?? document.body : null;

  const atCap = project.photos.length >= MAX_FIELD_PROJECT_PHOTOS;
  const photos = useMemo(
    () => [...project.photos].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)),
    [project.photos],
  );
  const analyzed = photos.filter((p) => p.aiSummary).length;
  const statusLine = importing
    ? "Saving photo…"
    : analyzing
      ? "AI is writing your storm damage report…"
      : photos.length === 0
        ? "Open the camera and document the roof"
        : keepShooting && !atCap
          ? "Photo saved — camera ready for the next shot"
          : `${photos.length} photo${photos.length === 1 ? "" : "s"} saved · report ready`;

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
        className="absolute inset-0 bg-[#0b1220]/55 backdrop-blur-[2px]"
        aria-label="Close damage report"
        onClick={onClose}
      />
      <div className="relative z-[1] flex max-h-[min(94vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#f1f5f9_100%)] shadow-[0_-12px_40px_rgba(15,23,42,0.25)] sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0f766e]">
              <Sparkles className="h-3.5 w-3.5" />
              Storm damage report
            </p>
            <h2 id="storm-damage-sheet-title" className="mt-1 truncate text-lg font-semibold tracking-tight text-[#0f172a]">
              {project.name}
            </h2>
            {project.address ? (
              <p className="mt-0.5 truncate text-xs text-[#64748b]">{project.address}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-[#64748b] hover:bg-black/5 hover:text-[#0f172a]"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-4 mb-3 rounded-2xl border border-[#cbd5e1]/80 bg-white/80 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-[#334155]">
            <span className="inline-flex items-center gap-1.5">
              {(importing || analyzing) && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0f766e]" />}
              {!importing && !analyzing && photos.length > 0 ? (
                <Check className="h-3.5 w-3.5 text-[#0f766e]" />
              ) : null}
              {statusLine}
            </span>
            <span className="tabular-nums text-[#64748b]">
              {photos.length}/{MAX_FIELD_PROJECT_PHOTOS}
              {canUseAi ? ` · AI ${analyzed}/${photos.length}` : ""}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-3">
          {importError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {importError}
              <button type="button" className="ml-2 underline" onClick={onDismissError}>
                Dismiss
              </button>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              size="lg"
              className="h-12 w-full gap-2 rounded-2xl bg-[#0f172a] text-base font-semibold text-white hover:bg-[#1e293b]"
              disabled={atCap || importing}
              onClick={() => {
                onKeepShootingChange(true);
                openCamera();
              }}
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {photos.length === 0 ? "Take first photo" : "Take another photo"}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-12 w-full gap-2 rounded-2xl border-[#cbd5e1] bg-white font-semibold text-[#0f172a]"
              disabled={atCap || importing}
              onClick={openGallery}
            >
              <ImagePlus className="h-4 w-4" />
              Add from gallery
            </Button>
          </div>

          <label className="flex items-start gap-2 text-xs leading-relaxed text-[#475569]">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={keepShooting}
              onChange={(e) => onKeepShootingChange(e.target.checked)}
            />
            <span>
              Keep the camera open after each shot for rapid multi-photo documentation
              {!canUseAi ? ". Sign in to auto-build the AI report." : ". AI updates the report after every photo."}
            </span>
          </label>

          {photos.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#94a3b8] bg-white/70 px-4 py-10 text-center text-sm text-[#64748b]">
              Capture elevations, slopes, and close-ups. Each photo is saved immediately and fed into the report.
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((ph) => (
                <Thumb
                  key={ph.id}
                  photo={ph}
                  analyzing={analyzing && !ph.aiSummary}
                  onOpen={onOpenLightbox}
                  onRemove={() => onRemovePhoto(ph.id)}
                />
              ))}
            </ul>
          )}

          <section className="rounded-2xl border border-[#cbd5e1] bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#0f172a]">AI storm damage report</h3>
              {analyzing ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-[#0f766e]">
                  <Loader2 className="h-3 w-3 animate-spin" /> Updating
                </span>
              ) : null}
            </div>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-[#334155]">
              {project.aiReport?.trim() ||
                (canUseAi
                  ? "Report will appear here as soon as the first photo is analyzed."
                  : "Sign in to generate an automatic AI storm damage report from your photos.")}
            </pre>
          </section>
        </div>

        <div className="flex flex-col gap-2 border-t border-[#e2e8f0] bg-white/90 px-4 py-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 rounded-2xl border-[#cbd5e1] font-semibold"
            onClick={onOpenFullJob}
          >
            <ExternalLink className="h-4 w-4" />
            Open full job
          </Button>
          <Button
            type="button"
            className="w-full rounded-2xl bg-[#0f766e] font-semibold text-white hover:bg-[#0d9488]"
            onClick={() => {
              onKeepShootingChange(false);
              onClose();
            }}
          >
            Finish report
          </Button>
        </div>
      </div>
    </div>,
    mount,
  );
}
