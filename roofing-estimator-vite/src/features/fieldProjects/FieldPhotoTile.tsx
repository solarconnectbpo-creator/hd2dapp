import { useState } from "react";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import type { DamagePhoto } from "../../lib/fieldProjectTypes";
import { useRemotePhotoUrl } from "./useRemotePhotoUrl";

async function urlToJpegDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

/**
 * One photo in a field job's gallery.
 *
 * Split out of the panel so each tile can independently resolve its image, which may
 * live in localStorage on this device or in R2 when the job came from another device.
 */
export function FieldPhotoTile({
  photo,
  aiBusy,
  onOpenLightbox,
  onCaptionChange,
  onRunAi,
  onRemove,
}: {
  photo: DamagePhoto;
  aiBusy: boolean;
  onOpenLightbox: (url: string) => void;
  onCaptionChange: (caption: string) => void;
  onRunAi: (imageDataUrl: string) => void;
  onRemove: () => void;
}) {
  const src = useRemotePhotoUrl(photo);
  const pendingDownload = !src && Boolean(photo.remoteKey);
  const [resolvingAi, setResolvingAi] = useState(false);
  const canRunAi = Boolean(photo.imageDataUrl?.startsWith("data:image/") || src);

  const handleRunAi = async () => {
    if (photo.imageDataUrl?.startsWith("data:image/")) {
      onRunAi(photo.imageDataUrl);
      return;
    }
    if (!src) return;
    setResolvingAi(true);
    try {
      const dataUrl = src.startsWith("data:image/") ? src : await urlToJpegDataUrl(src);
      onRunAi(dataUrl);
    } catch {
      // Parent surfaces AI errors; leave a quiet failure here for blob decode issues.
    } finally {
      setResolvingAi(false);
    }
  };

  return (
    <li className="overflow-hidden rounded-lg border border-black/10 bg-[#f8fafc]">
      {src ? (
        <button
          type="button"
          className="block w-full focus:outline-none focus:ring-2 focus:ring-black/20"
          onClick={() => onOpenLightbox(src)}
        >
          <img src={src} alt={photo.caption || "Damage photo"} className="h-40 w-full object-cover" />
        </button>
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-black/5 text-xs text-black/60">
          {pendingDownload ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Loading photo…
            </span>
          ) : (
            "Photo is on the device that captured it"
          )}
        </div>
      )}
      <div className="space-y-2 p-2">
        <input
          className="w-full rounded border border-black/15 bg-[#f3f4f6] px-2 py-1 text-sm text-black"
          placeholder="Caption"
          value={photo.caption ?? ""}
          onChange={(e) => onCaptionChange(e.target.value)}
        />
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-xs"
            disabled={aiBusy || resolvingAi || !canRunAi}
            title={canRunAi ? undefined : "Photo not available on this device yet"}
            onClick={() => void handleRunAi()}
          >
            {aiBusy || resolvingAi ? (
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
            onClick={onRemove}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Remove
          </Button>
        </div>
        {photo.aiSummary ? (
          <div className="hd2d-report-panel rounded p-2 text-xs">
            <p className="font-semibold text-black">{photo.aiSummary.summary}</p>
            <p className="mt-1 text-black">Types: {photo.aiSummary.damageTypes.join(", ") || "—"}</p>
            <p className="text-black">
              Severity: {photo.aiSummary.severity}/5 · Action: {photo.aiSummary.recommendedAction}
            </p>
            {photo.aiSummary.notes ? (
              <p className="mt-1 text-black/80">{photo.aiSummary.notes}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}
