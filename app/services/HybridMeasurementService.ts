/**
 * Orchestrates multiple measurement / imagery providers:
 * - Roof3D API (normalized area / perimeter / pitch + lineals)
 * - Nearmap coverage
 * - EagleView order placement
 *
 * All network calls are best-effort; failures on one provider do not block
 * the others unless `requireAll` is enabled.
 */

import {
  EagleViewClient,
  type EagleViewPlaceOrderRequest,
} from "./api/EagleViewClient";
import { NearmapClient } from "./api/NearmapClient";
import { Roof3DMeasurementClient } from "./api/Roof3DMeasurementClient";

export type HybridMeasurementPriority = "accuracy" | "speed" | "cost";

export interface HybridMeasurementRequest {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  priority?: HybridMeasurementPriority;
  /** Passed through to EagleView `referenceId` when ordering. */
  referenceId?: string;
}

export interface HybridMeasurementPayload {
  address: string;
  latitude: number;
  longitude: number;
  tile: { z: number; x: number; y: number };
  nearmapSurveyIds: string[];
  eagleViewOrderId?: string;
  eagleViewStatus?: string;
  roofAreaSqFt?: number;
  roofPerimeterFt?: number;
  roofPitch?: string;
  ridgesLf?: number;
  valleysLf?: number;
  hipsLf?: number;
  rakesLf?: number;
  eavesLf?: number;
}

export interface HybridMeasurementResult {
  success: boolean;
  data: HybridMeasurementPayload | null;
  provider: "roof3d" | "eagleview" | "nearmap" | "hybrid" | "fallback";
  confidence: number;
  errorMessage?: string;
  retryCount: number;
  processingTimeMs: number;
  roof3dRaw?: unknown;
  nearmapRaw?: unknown;
  eagleViewRaw?: unknown;
}

export type HybridMeasurementServiceOptions = {
  roof3d?: Roof3DMeasurementClient;
  nearmap?: NearmapClient;
  eagleView?: EagleViewClient;
  /** Zoom level for slippy tile → Nearmap coverage lookup (default 19). */
  coverageZoom?: number;
  /** If true, every *enabled* provider must succeed (no thrown errors). */
  requireAll?: boolean;
};

/** Web Mercator slippy tile index (Google / OSM scheme). */
export function latLngToTileXYZ(
  lat: number,
  lng: number,
  zoom: number,
): { z: number; x: number; y: number } {
  const z = Math.floor(zoom);
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { z, x, y };
}

function extractSurveyIds(coverage: unknown): string[] {
  if (!coverage || typeof coverage !== "object") return [];
  const surveys = (coverage as { surveys?: { id?: string }[] }).surveys;
  if (!Array.isArray(surveys)) return [];
  return surveys
    .map((s) => s?.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

function hasNearmapKey(): boolean {
  return !!process.env.EXPO_PUBLIC_NEARMAP_API_KEY?.trim();
}

function hasRoof3dConfig(): boolean {
  return !!(
    process.env.EXPO_PUBLIC_ROOF3D_API_URL?.trim() ||
    process.env.EXPO_PUBLIC_3D_ROOF_API_URL?.trim()
  );
}

function hasEagleViewAuth(): boolean {
  return !!(
    process.env.EXPO_PUBLIC_EAGLEVIEW_ACCESS_TOKEN?.trim() ||
    (process.env.EXPO_PUBLIC_EAGLEVIEW_CLIENT_ID?.trim() &&
      process.env.EXPO_PUBLIC_EAGLEVIEW_CLIENT_SECRET?.trim())
  );
}

export class HybridMeasurementService {
  private readonly roof3d: Roof3DMeasurementClient | null;
  private readonly nearmap: NearmapClient | null;
  private readonly eagleView: EagleViewClient | null;
  private readonly coverageZoom: number;
  private readonly requireAll: boolean;

  constructor(opts: HybridMeasurementServiceOptions = {}) {
    this.roof3d =
      opts.roof3d ?? (hasRoof3dConfig() ? new Roof3DMeasurementClient() : null);
    this.nearmap =
      opts.nearmap ?? (hasNearmapKey() ? new NearmapClient() : null);
    this.eagleView =
      opts.eagleView ?? (hasEagleViewAuth() ? new EagleViewClient() : null);
    this.coverageZoom = opts.coverageZoom ?? 19;
    this.requireAll = opts.requireAll ?? false;
  }

  /** Run Roof3D, Nearmap, and EagleView in one pass. */
  async measure(
    req: HybridMeasurementRequest,
  ): Promise<HybridMeasurementResult> {
    const t0 = Date.now();
    const tile = latLngToTileXYZ(
      req.latitude,
      req.longitude,
      this.coverageZoom,
    );

    let roof3dRaw: unknown;
    let nearmapRaw: unknown;
    let eagleViewRaw: unknown;
    let nearmapSurveyIds: string[] = [];
    let eagleViewOrderId: string | undefined;
    let eagleViewStatus: string | undefined;
    let roofAreaSqFt: number | undefined;
    let roofPerimeterFt: number | undefined;
    let roofPitch: string | undefined;
    let ridgesLf: number | undefined;
    let valleysLf: number | undefined;
    let hipsLf: number | undefined;
    let rakesLf: number | undefined;
    let eavesLf: number | undefined;

    const errors: string[] = [];
    let roof3dFetchOk = false;
    let nearmapFetchOk = false;
    let eagleViewFetchOk = false;

    if (this.roof3d) {
      try {
        const r3 = await this.roof3d.measure({
          address: req.address,
          city: req.city,
          state: req.state,
          zipCode: req.zipCode,
          latitude: req.latitude,
          longitude: req.longitude,
          priority: req.priority,
          referenceId: req.referenceId,
        });
        roof3dRaw = r3.raw;
        roof3dFetchOk = true;
        roofAreaSqFt = r3.metrics.roofAreaSqFt;
        roofPerimeterFt = r3.metrics.roofPerimeterFt;
        roofPitch = r3.metrics.roofPitch;
        ridgesLf = r3.metrics.ridgesLf;
        valleysLf = r3.metrics.valleysLf;
        hipsLf = r3.metrics.hipsLf;
        rakesLf = r3.metrics.rakesLf;
        eavesLf = r3.metrics.eavesLf;
      } catch (e) {
        errors.push(`Roof3D: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (this.nearmap) {
      try {
        nearmapRaw = await this.nearmap.getCoverageByTile(
          tile.z,
          tile.x,
          tile.y,
          { resources: "photos,tiles:Vert" },
        );
        nearmapFetchOk = true;
        nearmapSurveyIds = extractSurveyIds(nearmapRaw);
      } catch (e) {
        errors.push(`Nearmap: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (this.eagleView) {
      const orderBody: EagleViewPlaceOrderRequest = {
        address: {
          addressLine1: req.address,
          city: req.city,
          state: req.state,
          postalCode: req.zipCode,
          countryCode: "US",
          latitude: req.latitude,
          longitude: req.longitude,
        },
        referenceId: req.referenceId,
        metadata: { priority: req.priority },
      };
      try {
        const ev = await this.eagleView.placeOrder(orderBody);
        eagleViewFetchOk = true;
        eagleViewOrderId = ev.orderId || undefined;
        eagleViewStatus = ev.status;
        eagleViewRaw = ev.raw;
      } catch (e) {
        errors.push(`EagleView: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const enabledCount = [this.roof3d, this.nearmap, this.eagleView].filter(
      Boolean,
    ).length;
    if (enabledCount === 0) {
      return {
        success: false,
        data: null,
        provider: "fallback",
        confidence: 0,
        errorMessage:
          "No measurement providers configured (set EXPO_PUBLIC_ROOF3D_API_URL and/or Nearmap/EagleView env vars).",
        retryCount: 0,
        processingTimeMs: Date.now() - t0,
      };
    }

    const anySuccess =
      (this.roof3d ? roof3dFetchOk : false) ||
      (this.nearmap ? nearmapFetchOk : false) ||
      (this.eagleView ? eagleViewFetchOk : false);

    const allEnabledSuccess =
      (this.roof3d ? roof3dFetchOk : true) &&
      (this.nearmap ? nearmapFetchOk : true) &&
      (this.eagleView ? eagleViewFetchOk : true);

    const success = this.requireAll ? allEnabledSuccess : anySuccess;

    let provider: HybridMeasurementResult["provider"] = "fallback";
    const okCount = [roof3dFetchOk, nearmapFetchOk, eagleViewFetchOk].filter(
      Boolean,
    ).length;
    if (okCount >= 2) provider = "hybrid";
    else if (roof3dFetchOk) provider = "roof3d";
    else if (this.nearmap && nearmapFetchOk) {
      provider = "nearmap";
    } else if (this.eagleView && eagleViewFetchOk) {
      provider = "eagleview";
    }

    let confidence = 0.35;
    if (okCount >= 2) confidence = 0.92;
    else if (roof3dFetchOk || nearmapFetchOk || eagleViewFetchOk) confidence = 0.72;
    if (req.priority === "speed" && nearmapFetchOk)
      confidence = Math.min(1, confidence + 0.05);
    if (req.priority === "accuracy" && (eagleViewFetchOk || roof3dFetchOk))
      confidence = Math.min(1, confidence + 0.05);

    const data: HybridMeasurementPayload | null = anySuccess
      ? {
          address: req.address,
          latitude: req.latitude,
          longitude: req.longitude,
          tile,
          nearmapSurveyIds,
          eagleViewOrderId,
          eagleViewStatus,
          roofAreaSqFt,
          roofPerimeterFt,
          roofPitch,
          ridgesLf,
          valleysLf,
          hipsLf,
          rakesLf,
          eavesLf,
        }
      : null;

    return {
      success,
      data,
      provider,
      confidence,
      errorMessage: errors.length && !success ? errors.join(" | ") : undefined,
      retryCount: 0,
      processingTimeMs: Date.now() - t0,
      roof3dRaw,
      nearmapRaw,
      eagleViewRaw,
    };
  }
}

export function createHybridMeasurementServiceFromEnv(): HybridMeasurementService {
  return new HybridMeasurementService();
}
