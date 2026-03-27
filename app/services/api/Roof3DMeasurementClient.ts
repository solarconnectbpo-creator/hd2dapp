/**
 * Generic client for a Roof 3D measurement API service.
 *
 * Intended for APIs like:
 * https://github.com/DeV-Global-LLC/3D-Roof-Measurement-System
 *
 * Endpoint and auth are env-driven to support different deployments.
 */

export interface Roof3DClientOptions {
  baseUrl?: string;
  path?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

export interface Roof3DRequest {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  priority?: "accuracy" | "speed" | "cost";
  referenceId?: string;
}

export interface Roof3DNormalizedMetrics {
  roofAreaSqFt?: number;
  roofPerimeterFt?: number;
  roofPitch?: string;
  ridgesLf?: number;
  valleysLf?: number;
  hipsLf?: number;
  rakesLf?: number;
  eavesLf?: number;
  confidence?: number;
}

const DEFAULT_BASE =
  process.env.EXPO_PUBLIC_ROOF3D_API_URL?.trim() ??
  process.env.EXPO_PUBLIC_3D_ROOF_API_URL?.trim() ??
  "";
const DEFAULT_PATH =
  process.env.EXPO_PUBLIC_ROOF3D_API_PATH?.trim() ??
  process.env.EXPO_PUBLIC_3D_ROOF_API_PATH?.trim() ??
  "/measurements";
const DEFAULT_KEY =
  process.env.EXPO_PUBLIC_ROOF3D_API_KEY?.trim() ??
  process.env.EXPO_PUBLIC_3D_ROOF_API_KEY?.trim() ??
  "";

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function num(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function toPitchString(degOrPitch: unknown): string | undefined {
  const s = str(degOrPitch);
  if (s) return s;
  const d = num(degOrPitch);
  if (d === undefined) return undefined;
  const rise = Math.round(Math.tan((d * Math.PI) / 180) * 12);
  if (rise <= 0 || !Number.isFinite(rise)) return undefined;
  return `${rise}/12`;
}

export class Roof3DMeasurementClient {
  private readonly baseUrl: string;
  private readonly path: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: Roof3DClientOptions = {}) {
    this.baseUrl = opts.baseUrl?.trim() ?? DEFAULT_BASE;
    this.path = opts.path?.trim() || DEFAULT_PATH;
    this.apiKey = opts.apiKey?.trim() ?? DEFAULT_KEY;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  isConfigured(): boolean {
    return !!this.baseUrl;
  }

  async measure(req: Roof3DRequest): Promise<{
    metrics: Roof3DNormalizedMetrics;
    raw: unknown;
  }> {
    if (!this.baseUrl) {
      throw new Error(
        "Roof3DMeasurementClient not configured. Set EXPO_PUBLIC_ROOF3D_API_URL.",
      );
    }
    const url = joinUrl(this.baseUrl, this.path);
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

    const body = {
      address: req.address,
      city: req.city,
      state: req.state,
      zipCode: req.zipCode,
      latitude: req.latitude,
      longitude: req.longitude,
      priority: req.priority,
      referenceId: req.referenceId,
    };

    const res = await this.fetchImpl(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let raw: unknown = {};
    try {
      raw = text ? JSON.parse(text) : {};
    } catch {
      raw = { text };
    }
    if (!res.ok) {
      throw new Error(`Roof3D API ${res.status}: ${JSON.stringify(raw)}`);
    }

    const root = raw as Record<string, unknown>;
    const data =
      (root.data as Record<string, unknown> | undefined) ??
      (root.result as Record<string, unknown> | undefined) ??
      root;
    const metricsObj =
      (data.metrics as Record<string, unknown> | undefined) ?? data;

    const metrics: Roof3DNormalizedMetrics = {
      roofAreaSqFt:
        num(metricsObj.roofAreaSqFt) ??
        num(metricsObj.area_sqft) ??
        num(metricsObj.areaSqFt) ??
        num(metricsObj.area),
      roofPerimeterFt:
        num(metricsObj.roofPerimeterFt) ??
        num(metricsObj.perimeter_ft) ??
        num(metricsObj.perimeterFt) ??
        num(metricsObj.perimeter),
      roofPitch:
        toPitchString(metricsObj.roofPitch) ??
        toPitchString(metricsObj.pitch) ??
        toPitchString(metricsObj.pitch_deg) ??
        toPitchString(metricsObj.pitchDegrees),
      ridgesLf:
        num(metricsObj.ridgesLf) ??
        num(metricsObj.ridges_ft) ??
        num(metricsObj.ridgeLength),
      valleysLf:
        num(metricsObj.valleysLf) ??
        num(metricsObj.valleys_ft) ??
        num(metricsObj.valleyLength),
      hipsLf:
        num(metricsObj.hipsLf) ??
        num(metricsObj.hips_ft) ??
        num(metricsObj.hipLength),
      rakesLf: num(metricsObj.rakesLf) ?? num(metricsObj.rakes_ft),
      eavesLf: num(metricsObj.eavesLf) ?? num(metricsObj.eaves_ft),
      confidence:
        num(metricsObj.confidence) ??
        num(data.confidence) ??
        num(root.confidence),
    };

    return { metrics, raw };
  }
}

export function createRoof3DMeasurementClientFromEnv(): Roof3DMeasurementClient {
  return new Roof3DMeasurementClient();
}
