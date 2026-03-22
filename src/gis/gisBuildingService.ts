/**
 * GIS Building Mapping Service
 * Integrates OSM (Overpass), optional Mapbox geocoding/static imagery.
 * Shadow analysis uses DOM APIs — web only.
 */

import { forwardGeocodeNominatim } from "@/src/roofReports/reverseGeocode";

export interface BuildingFootprint {
  id: string;
  osmId: number;
  coordinates: Array<[number, number]>;
  area: number;
  perimeter: number;
  height?: number;
  roofHeight?: number;
  roofShape?: "flat" | "gabled" | "hipped" | "mansard" | "gambrel" | "unknown";
  roofDirection?: number;
  roofMaterial?: string;
  levels?: number;
  centerPoint: [number, number];
  bbox: {
    minLon: number;
    minLat: number;
    maxLon: number;
    maxLat: number;
  };
}

export interface RoofGeometry {
  area: number;
  pitch: number;
  direction: number;
  shape: string;
  estimatedMaterial?: string;
  ridgeLength?: number;
  eaveLength?: number;
  boundingDimensions: {
    length: number;
    width: number;
  };
  complexityScore: number;
}

export interface AerialImageryData {
  imageUrl: string;
  provider: "mapbox" | "google" | "bing" | "usgs" | "esri";
  resolution: number;
  captureDate: string;
  cloudCover?: number;
  zoom: number;
}

export interface BuildingWithImagery extends BuildingFootprint {
  aerialImagery?: AerialImageryData;
  roofGeometry?: RoofGeometry;
  shadowAnalysis?: {
    sunAngle: number;
    shadowLength: number;
    estimatedHeight: number;
    confidence: number;
  };
}

function normalizeRoofShape(tag?: string): BuildingFootprint["roofShape"] {
  const s = (tag || "").toLowerCase().trim();
  const allowed = new Set(["flat", "gabled", "hipped", "mansard", "gambrel"]);
  if (allowed.has(s)) return s as BuildingFootprint["roofShape"];
  return "unknown";
}

export class GISBuildingService {
  private overpassUrl = "https://overpass-api.de/api/interpreter";
  private mapboxToken?: string;
  private cacheMap: Map<
    string,
    { data: BuildingFootprint[]; timestamp: number }
  > = new Map();
  private readonly CACHE_DURATION = 604800000;

  constructor(mapboxToken?: string) {
    this.mapboxToken = mapboxToken?.trim() || undefined;
  }

  async getBuildingFootprints(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
    includeRoofData = true,
  ): Promise<BuildingFootprint[]> {
    void includeRoofData;
    const cacheKey = `buildings_${minLat}_${minLon}_${maxLat}_${maxLon}`;

    const cached = this.cacheMap.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const query = this.buildOverpassQuery(minLat, minLon, maxLat, maxLon);
      const response = await fetch(this.overpassUrl, {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.statusText}`);
      }

      const data = (await response.json()) as unknown;
      const buildings = this.parseOverpassResponse(data);

      this.cacheMap.set(cacheKey, { data: buildings, timestamp: Date.now() });
      return buildings;
    } catch (error) {
      console.error("Error fetching building footprints:", error);
      return [];
    }
  }

  async getBuildingByAddress(
    address: string,
    _jurisdiction = "USA",
  ): Promise<BuildingFootprint | null> {
    void _jurisdiction;
    try {
      const coords = await this.geocodeAddress(address);
      if (!coords) return null;

      const buffer = 0.0005;
      const buildings = await this.getBuildingFootprints(
        coords.lat - buffer,
        coords.lon - buffer,
        coords.lat + buffer,
        coords.lon + buffer,
        true,
      );

      if (buildings.length === 0) return null;

      let best: BuildingFootprint | null = null;
      let bestD = Infinity;
      for (const b of buildings) {
        const [blon, blat] = b.centerPoint;
        const d = this.haversineDistance(coords.lat, coords.lon, blat, blon);
        if (d < bestD) {
          bestD = d;
          best = b;
        }
      }
      return best;
    } catch (error) {
      console.error("Error getting building by address:", error);
      return null;
    }
  }

  private buildOverpassQuery(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
  ): string {
    const bbox = `${minLat},${minLon},${maxLat},${maxLon}`;
    return `
[out:json][timeout:60];
(
  way["building"](${bbox});
);
out geom;
`;
  }

  private parseOverpassResponse(data: unknown): BuildingFootprint[] {
    const buildings: BuildingFootprint[] = [];
    const d = data as { elements?: unknown[] };
    if (!Array.isArray(d.elements)) return buildings;

    for (const element of d.elements) {
      const el = element as {
        type?: string;
        id?: number;
        geometry?: Array<{ lon: number; lat: number }>;
        tags?: Record<string, string | undefined>;
      };
      if (el.type !== "way" || !el.id) continue;

      const coordinates = this.extractCoordinates(el.geometry);
      if (coordinates.length < 3) continue;

      const building: BuildingFootprint = {
        id: `${el.type}_${el.id}`,
        osmId: el.id,
        coordinates,
        centerPoint: this.calculateCenterPoint(coordinates),
        bbox: this.calculateBBox(coordinates),
        area: this.calculateArea(coordinates),
        perimeter: this.calculatePerimeter(coordinates),
        height: this.parseHeight(el.tags?.height),
        roofHeight: this.parseHeight(el.tags?.["roof:height"]),
        roofShape: normalizeRoofShape(el.tags?.["roof:shape"]),
        roofDirection: this.parseAngle(el.tags?.["roof:direction"]),
        roofMaterial: el.tags?.["roof:material"],
        levels: this.parseLevels(el.tags?.["building:levels"]),
      };

      buildings.push(building);
    }

    return buildings;
  }

  private extractCoordinates(
    geometry: Array<{ lon: number; lat: number }> | undefined,
  ): Array<[number, number]> {
    if (!geometry?.length) return [];
    return geometry.map((point) => [point.lon, point.lat]);
  }

  private parseHeight(value?: string): number | undefined {
    if (!value) return undefined;
    const match = value.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : undefined;
  }

  private parseAngle(value?: string): number | undefined {
    if (!value) return undefined;

    const match = value.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      const angle = parseFloat(match[1]);
      return angle >= 0 && angle <= 360 ? angle : undefined;
    }

    const directions: Record<string, number> = {
      n: 0,
      north: 0,
      e: 90,
      east: 90,
      s: 180,
      south: 180,
      w: 270,
      west: 270,
      ne: 45,
      nw: 315,
      se: 135,
      sw: 225,
    };

    return directions[value.toLowerCase()];
  }

  private parseLevels(value?: string): number | undefined {
    if (!value) return undefined;
    const match = value.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private calculateCenterPoint(
    coords: Array<[number, number]>,
  ): [number, number] {
    let sumLon = 0;
    let sumLat = 0;
    for (const [lon, lat] of coords) {
      sumLon += lon;
      sumLat += lat;
    }
    return [sumLon / coords.length, sumLat / coords.length];
  }

  private calculateBBox(coords: Array<[number, number]>) {
    let minLon = coords[0][0];
    let maxLon = coords[0][0];
    let minLat = coords[0][1];
    let maxLat = coords[0][1];

    for (const [lon, lat] of coords) {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }

    return { minLon, maxLon, minLat, maxLat };
  }

  /** Rough area (m²): shoelace on lon/lat then scaled — approximate away from equator. */
  private calculateArea(coords: Array<[number, number]>): number {
    let area = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      area += coords[i][0] * coords[i + 1][1] - coords[i + 1][0] * coords[i][1];
    }
    area = Math.abs(area) / 2;
    const metersPerDegree = 111000;
    return area * metersPerDegree * metersPerDegree;
  }

  private calculatePerimeter(coords: Array<[number, number]>): number {
    let perimeter = 0;
    for (let i = 0; i < coords.length; i++) {
      const p1 = coords[i];
      const p2 = coords[(i + 1) % coords.length];
      perimeter += this.haversineDistance(p1[1], p1[0], p2[1], p2[0]);
    }
    return perimeter;
  }

  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async calculateRoofGeometry(
    building: BuildingFootprint,
  ): Promise<RoofGeometry> {
    const bbox = building.bbox;
    const length = this.haversineDistance(
      bbox.minLat,
      bbox.minLon,
      bbox.maxLat,
      bbox.minLon,
    );
    const width = this.haversineDistance(
      bbox.minLat,
      bbox.minLon,
      bbox.minLat,
      bbox.maxLon,
    );

    const estimatedPitch = this.estimateRoofPitch(building);
    const ridgeLength = Math.max(length, width);
    const eaveLength = Math.min(length, width);
    const complexityScore = this.calculateComplexityScore(building);

    return {
      area: building.area,
      pitch: estimatedPitch,
      direction: building.roofDirection ?? 0,
      shape: building.roofShape || "unknown",
      estimatedMaterial: building.roofMaterial,
      ridgeLength,
      eaveLength,
      boundingDimensions: { length, width },
      complexityScore,
    };
  }

  private estimateRoofPitch(building: BuildingFootprint): number {
    const shapeMultipliers: Record<string, number> = {
      flat: 0,
      gabled: 6,
      hipped: 5,
      mansard: 7,
      gambrel: 8,
      unknown: 4,
    };

    const basePitch = shapeMultipliers[building.roofShape || "unknown"] || 4;
    const pitchRatio = basePitch / 12;
    const pitchDegrees = Math.atan(pitchRatio) * (180 / Math.PI);
    return Math.round(pitchDegrees * 10) / 10;
  }

  private calculateComplexityScore(building: BuildingFootprint): number {
    let score = 0;

    const shapeScores: Record<string, number> = {
      flat: 0.1,
      gabled: 0.4,
      hipped: 0.6,
      mansard: 0.8,
      gambrel: 0.9,
      unknown: 0.5,
    };
    score += shapeScores[building.roofShape || "unknown"] || 0.5;

    const areaScore = Math.min(0.3, building.area / 1000);
    score += areaScore;

    return Math.min(1, score);
  }

  async getAerialImagery(
    building: BuildingFootprint,
    zoom = 18,
  ): Promise<AerialImageryData | null> {
    if (!this.mapboxToken) {
      console.warn("Mapbox token not configured");
      return null;
    }

    try {
      const [lon, lat] = building.centerPoint;
      const imageUrl =
        `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/` +
        `${lon},${lat},${zoom},0,0/600x400@2x?access_token=${this.mapboxToken}`;

      return {
        imageUrl,
        provider: "mapbox",
        resolution: this.calculateResolution(zoom),
        captureDate: new Date().toISOString(),
        zoom,
      };
    } catch (error) {
      console.error("Error getting aerial imagery:", error);
      return null;
    }
  }

  private calculateResolution(zoom: number): number {
    const metersPerPixel = 40075016.686 / (256 * Math.pow(2, zoom));
    return Math.round(metersPerPixel * 100) / 100;
  }

  async analyzeShadows(
    imageUrl: string,
    sunAngle: number,
    pixelsPerMeter: number,
  ): Promise<{
    shadowLength: number;
    estimatedHeight: number;
    confidence: number;
  } | null> {
    if (typeof document === "undefined" || typeof Image === "undefined") {
      return null;
    }

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";

      return new Promise((resolve) => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            resolve(null);
            return;
          }

          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const data = imageData.data;

          let shadowPixels = 0;
          for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (brightness < 100) shadowPixels++;
          }

          const shadowDensity = shadowPixels / (img.width * img.height);
          const shadowLength = Math.sqrt(shadowDensity * img.width);

          const sunAngleRad = (sunAngle * Math.PI) / 180;
          const estimatedHeight =
            Math.tan(sunAngleRad) * (shadowLength / pixelsPerMeter);

          resolve({
            shadowLength,
            estimatedHeight: Math.round(estimatedHeight),
            confidence: Math.min(1, shadowDensity * 2),
          });
        };

        img.onerror = () => resolve(null);
        img.src = imageUrl;
      });
    } catch (error) {
      console.error("Error analyzing shadows:", error);
      return null;
    }
  }

  private async geocodeAddress(
    address: string,
  ): Promise<{ lat: number; lon: number } | null> {
    try {
      if (this.mapboxToken) {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${this.mapboxToken}`,
        );
        const data = (await response.json()) as {
          features?: Array<{ center?: [number, number] }>;
        };
        const c = data.features?.[0]?.center;
        if (c && c.length >= 2) {
          const [lon, lat] = c;
          if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
        }
      }

      const hits = await forwardGeocodeNominatim(address);
      if (hits.length > 0) {
        return { lat: hits[0].lat, lon: hits[0].lng };
      }
      return null;
    } catch (error) {
      console.error("Error geocoding address:", error);
      return null;
    }
  }

  async getEnhancedBuildingData(
    building: BuildingFootprint,
  ): Promise<BuildingWithImagery> {
    const [roofGeometry, aerialImagery] = await Promise.all([
      this.calculateRoofGeometry(building),
      this.getAerialImagery(building),
    ]);

    let shadowAnalysis: BuildingWithImagery["shadowAnalysis"];
    if (aerialImagery) {
      const shadow = await this.analyzeShadows(
        aerialImagery.imageUrl,
        45,
        1 / aerialImagery.resolution,
      );
      if (shadow) {
        shadowAnalysis = {
          sunAngle: 45,
          shadowLength: shadow.shadowLength,
          estimatedHeight: shadow.estimatedHeight,
          confidence: shadow.confidence,
        };
      }
    }

    return {
      ...building,
      roofGeometry,
      aerialImagery: aerialImagery || undefined,
      shadowAnalysis,
    };
  }
}

export function createGISBuildingServiceFromEnv(): GISBuildingService {
  const token =
    typeof process !== "undefined" && process.env?.EXPO_PUBLIC_MAPBOX_TOKEN
      ? String(process.env.EXPO_PUBLIC_MAPBOX_TOKEN).trim()
      : undefined;
  return new GISBuildingService(token);
}

export default GISBuildingService;
