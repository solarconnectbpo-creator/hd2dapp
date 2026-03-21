/**
 * Orchestrates multiple measurement / imagery providers (Nearmap + EagleView).
 *
 * Typical flow:
 * 1. **Nearmap** — coverage at the property tile (survey IDs, capture metadata) when an API key is set.
 * 2. **EagleView** — optional measurement order when credentials/token are set (paths must match your contract).
 *
 * All network calls are best-effort; failures on one provider do not block the other unless you set `requireAll`.
 */

import {
  EagleViewClient,
  type EagleViewPlaceOrderRequest,
} from "./api/EagleViewClient";
import { NearmapClient } from "./api/NearmapClient";

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
}

export interface HybridMeasurementResult {
  success: boolean;
  data: HybridMeasurementPayload | null;
  provider: "eagleview" | "nearmap" | "hybrid" | "fallback";
  confidence: number;
  errorMessage?: string;
  retryCount: number;
  processingTimeMs: number;
  nearmapRaw?: unknown;
  eagleViewRaw?: unknown;
}

export type HybridMeasurementServiceOptions = {
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

function hasEagleViewAuth(): boolean {
  return !!(
    process.env.EXPO_PUBLIC_EAGLEVIEW_ACCESS_TOKEN?.trim() ||
    (process.env.EXPO_PUBLIC_EAGLEVIEW_CLIENT_ID?.trim() &&
      process.env.EXPO_PUBLIC_EAGLEVIEW_CLIENT_SECRET?.trim())
  );
}

export class HybridMeasurementService {
  private readonly nearmap: NearmapClient | null;
  private readonly eagleView: EagleViewClient | null;
  private readonly coverageZoom: number;
  private readonly requireAll: boolean;

  constructor(opts: HybridMeasurementServiceOptions = {}) {
    this.nearmap =
      opts.nearmap ?? (hasNearmapKey() ? new NearmapClient() : null);
    this.eagleView =
      opts.eagleView ?? (hasEagleViewAuth() ? new EagleViewClient() : null);
    this.coverageZoom = opts.coverageZoom ?? 19;
    this.requireAll = opts.requireAll ?? false;
  }

  /**
   * Run Nearmap coverage (if configured) and optional EagleView order (if configured).
   */
  async measure(
    req: HybridMeasurementRequest,
  ): Promise<HybridMeasurementResult> {
    const t0 = Date.now();
    const tile = latLngToTileXYZ(
      req.latitude,
      req.longitude,
      this.coverageZoom,
    );

    let nearmapRaw: unknown;
    let eagleViewRaw: unknown;
    let nearmapSurveyIds: string[] = [];
    let eagleViewOrderId: string | undefined;
    let eagleViewStatus: string | undefined;

    const errors: string[] = [];
    let nearmapFetchOk = false;
    let eagleViewFetchOk = false;

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

    const enabledCount = [this.nearmap, this.eagleView].filter(Boolean).length;
    if (enabledCount === 0) {
      return {
        success: false,
        data: null,
        provider: "fallback",
        confidence: 0,
        errorMessage:
          "No measurement providers configured (set EXPO_PUBLIC_NEARMAP_API_KEY and/or EagleView env vars).",
        retryCount: 0,
        processingTimeMs: Date.now() - t0,
      };
    }

    const anySuccess =
      (this.nearmap ? nearmapFetchOk : false) ||
      (this.eagleView ? eagleViewFetchOk : false);

    const allEnabledSuccess =
      (this.nearmap ? nearmapFetchOk : true) &&
      (this.eagleView ? eagleViewFetchOk : true);

    const success = this.requireAll ? allEnabledSuccess : anySuccess;

    let provider: HybridMeasurementResult["provider"] = "fallback";
    if (this.nearmap && this.eagleView) {
      if (nearmapFetchOk && eagleViewFetchOk) provider = "hybrid";
      else if (nearmapFetchOk) provider = "nearmap";
      else if (eagleViewFetchOk) provider = "eagleview";
    } else if (this.nearmap && nearmapFetchOk) {
      provider = "nearmap";
    } else if (this.eagleView && eagleViewFetchOk) {
      provider = "eagleview";
    }

    let confidence = 0.35;
    if (nearmapFetchOk && eagleViewFetchOk) confidence = 0.92;
    else if (nearmapFetchOk || eagleViewFetchOk) confidence = 0.72;
    if (req.priority === "speed" && nearmapFetchOk)
      confidence = Math.min(1, confidence + 0.05);
    if (req.priority === "accuracy" && eagleViewFetchOk)
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
      nearmapRaw,
      eagleViewRaw,
    };
  }
}

export function createHybridMeasurementServiceFromEnv(): HybridMeasurementService {
  return new HybridMeasurementService();
}
