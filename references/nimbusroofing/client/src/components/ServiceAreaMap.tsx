import { useEffect, useRef, useState } from "react";
import { MapView } from "@/components/Map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ServiceArea {
  name: string;
  center: { lat: number; lng: number };
  projects: number;
}

const SERVICE_AREAS: ServiceArea[] = [
  { name: "Stonebridge Ranch", center: { lat: 33.0823, lng: -96.6431 }, projects: 150 },
  { name: "Craig Ranch", center: { lat: 33.0956, lng: -96.5892 }, projects: 120 },
  { name: "Eldorado Heights", center: { lat: 33.1878, lng: -96.6156 }, projects: 95 },
  { name: "Trinity Falls", center: { lat: 33.2345, lng: -96.6789 }, projects: 80 },
  { name: "Tucker Hill", center: { lat: 33.1567, lng: -96.6234 }, projects: 70 },
  { name: "Adriatica Village", center: { lat: 33.0789, lng: -96.6123 }, projects: 60 },
];

export function ServiceAreaMap() {
  const [mapReady, setMapReady] = useState(false);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const handleMapReady = (map: google.maps.Map) => {
    mapInstanceRef.current = map;
    setMapReady(true);

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add markers for each service area
    SERVICE_AREAS.forEach((area) => {
      const marker = new google.maps.Marker({
        position: area.center,
        map: map,
        title: area.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#0ea5e9",
          fillOpacity: 0.8,
          strokeColor: "#0284c7",
          strokeWeight: 2,
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${area.name}</h3>
            <p style="font-size: 14px; color: #666;">${area.projects}+ completed projects</p>
          </div>
        `,
      });

      marker.addListener("click", () => {
        // Close all other info windows
        markersRef.current.forEach((m) => {
          const iw = (m as any).infoWindow;
          if (iw) iw.close();
        });
        infoWindow.open(map, marker);
      });

      (marker as any).infoWindow = infoWindow;
      markersRef.current.push(marker);
    });

    // Draw service area circle (15 mile radius from McKinney center)
    const mcKinneyCenter = { lat: 33.1972, lng: -96.6397 };
    new google.maps.Circle({
      strokeColor: "#0ea5e9",
      strokeOpacity: 0.6,
      strokeWeight: 2,
      fillColor: "#0ea5e9",
      fillOpacity: 0.15,
      map: map,
      center: mcKinneyCenter,
      radius: 24140, // 15 miles in meters
    });

    // Fit bounds to show all markers
    const bounds = new google.maps.LatLngBounds();
    SERVICE_AREAS.forEach((area) => {
      bounds.extend(area.center);
    });
    map.fitBounds(bounds);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Our Service Area in McKinney, TX</CardTitle>
          <p className="text-sm text-muted-foreground">
            We proudly serve McKinney and surrounding neighborhoods within a 15-mile radius
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full rounded-lg overflow-hidden border">
            <MapView
              center={{ lat: 33.1972, lng: -96.6397 }}
              zoom={11}
              onMapReady={handleMapReady}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SERVICE_AREAS.map((area) => (
          <Card key={area.name} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{area.name}</h3>
                <Badge variant="secondary">{area.projects}+ projects</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Click on the map to see more details
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <h3 className="font-bold mb-2">Not in these neighborhoods?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            We serve all of McKinney and surrounding areas within 15 miles. Call us to confirm we service your location!
          </p>
          <a
            href="tel:+12146126696"
            className="inline-flex items-center text-sm font-semibold text-primary hover:underline"
          >
            Call (214) 612-6696 →
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
