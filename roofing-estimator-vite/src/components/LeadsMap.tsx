import { useCallback, useMemo } from "react";
import type { ContactRecord } from "../lib/contactsCsv";
import { FallbackMap, type FallbackMapPoint } from "./FallbackMap";

type Props = {
  contacts: ContactRecord[];
  selectedId: string | null;
  onSelectContact: (id: string) => void;
  onOpenContact?: (id: string) => void;
};

export function LeadsMap({ contacts, selectedId, onSelectContact, onOpenContact }: Props) {
  const withCoords = useMemo(
    () =>
      contacts.filter(
        (c) => typeof c.lat === "number" && typeof c.lng === "number" && !Number.isNaN(c.lat) && !Number.isNaN(c.lng),
      ),
    [contacts],
  );

  const osmPoints = useMemo<FallbackMapPoint[]>(
    () =>
      withCoords.map((c) => ({
        id: c.id,
        lat: c.lat!,
        lng: c.lng!,
        label: c.name || "Lead",
      })),
    [withCoords],
  );

  const osmCenter = useMemo(() => {
    if (!withCoords.length) return { lat: 39.8283, lng: -98.5795 };
    const avgLat = withCoords.reduce((s, c) => s + c.lat!, 0) / withCoords.length;
    const avgLng = withCoords.reduce((s, c) => s + c.lng!, 0) / withCoords.length;
    return { lat: avgLat, lng: avgLng };
  }, [withCoords]);

  const handleOsmPointClick = useCallback(
    (id: string) => onSelectContact(id),
    [onSelectContact],
  );

  if (withCoords.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-black">
        No leads with map coordinates yet. Use &quot;Geocode addresses&quot; or ensure CSV includes latitude/longitude columns.
      </div>
    );
  }

  const selected = selectedId ? withCoords.find((c) => c.id === selectedId) : null;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
      <FallbackMap
        center={osmCenter}
        zoom={withCoords.length <= 1 ? 15 : 5}
        points={osmPoints}
        height={380}
        enableGps
        onPointClick={handleOsmPointClick}
      />
      {selected ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2 text-sm text-black">
          <div className="min-w-0">
            <div className="font-semibold truncate">{selected.name || "Lead"}</div>
            <div className="text-xs text-slate-600 truncate">
              {[selected.address, selected.city, selected.state, selected.zip].filter(Boolean).join(", ")}
            </div>
          </div>
          {onOpenContact ? (
            <button
              type="button"
              className="shrink-0 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-black hover:bg-slate-50"
              onClick={() => onOpenContact(selected.id)}
            >
              Open in estimator
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
