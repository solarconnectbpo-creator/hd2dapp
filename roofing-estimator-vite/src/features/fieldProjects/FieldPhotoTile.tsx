import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import type { DamagePhoto } from "../../lib/fieldProjectTypes";
import { useRemotePhotoUrl } from "./useRemotePhotoUrl";

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
            disabled={aiBusy || !photo.imageDataUrl}
            title={photo.imageDataUrl ? undefined : "Open on the device that captured this photo"}
            onClick={() => onRunAi(photo.imageDataUrl)}
          >
            {aiBusy ? (
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
          <div className="rounded bg-black/5 p-2 text-xs text-black">
            <p className="font-semibold">{photo.aiSummary.summary}</p>
            <p className="mt-1">Types: {photo.aiSummary.damageTypes.join(", ") || "—"}</p>
            <p>
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
