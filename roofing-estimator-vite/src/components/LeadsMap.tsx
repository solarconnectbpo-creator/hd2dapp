import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ContactRecord } from "../lib/contactsCsv";

// Default marker icons break under bundlers; fix paths.
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

type Props = {
  contacts: ContactRecord[];
  selectedId: string | null;
  onSelectContact: (id: string) => void;
  onOpenContact?: (id: string) => void;
};

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    const b = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(b, { padding: [40, 40], maxZoom: 16 });
  }, [map, points]);
  return null;
}

export function LeadsMap({ contacts, selectedId, onSelectContact, onOpenContact }: Props) {
  const withCoords = useMemo(
    () => contacts.filter((c) => typeof c.lat === "number" && typeof c.lng === "number" && !Number.isNaN(c.lat) && !Number.isNaN(c.lng)),
    [contacts],
  );
  const points = useMemo(() => withCoords.map((c) => [c.lat!, c.lng!] as [number, number]), [withCoords]);
  const center: [number, number] = points[0] ?? [39.8283, -98.5795];

  if (withCoords.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
        No leads with map coordinates yet. Use &quot;Geocode addresses&quot; or ensure CSV includes latitude/longitude columns.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
      <MapContainer center={center} zoom={points.length === 1 ? 14 : 4} style={{ height: 380, width: "100%" }} scrollWheelZoom>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds points={points} />
        {withCoords.map((c) => (
          <Marker
            key={c.id}
            position={[c.lat!, c.lng!]}
            eventHandlers={{
              click: () => onSelectContact(c.id),
            }}
            opacity={selectedId === c.id ? 1 : 0.85}
          >
            <Popup>
              <div className="min-w-[200px] text-sm">
                <div className="font-semibold text-slate-900">{c.name || "Lead"}</div>
                {(c.address || c.city) && (
                  <div className="mt-1 text-slate-600">
                    {[c.address, c.city, c.state, c.zip].filter(Boolean).join(", ")}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded bg-slate-900 px-2 py-1 text-xs text-white"
                    onClick={() => onSelectContact(c.id)}
                  >
                    Select
                  </button>
                  {onOpenContact && (
                    <button
                      type="button"
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
                      onClick={() => onOpenContact(c.id)}
                    >
                      Open in estimator
                    </button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
