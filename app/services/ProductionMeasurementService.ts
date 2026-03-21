/**
 * Production entry point for property measurements.
 *
 * - **Preferred:** `POST` to your backend (`EXPO_PUBLIC_MEASUREMENT_PROXY_URL` or
 *   `EXPO_PUBLIC_API_URL` + `EXPO_PUBLIC_MEASUREMENT_PROXY_PATH`) so Nearmap / EagleView
 *   secrets stay on the server.
 * - **Fallback:** optional in-process `HybridMeasurementService` only when
 *   `EXPO_PUBLIC_ALLOW_CLIENT_MEASUREMENT === "true"` (dev / special builds).
 */

import {
  HybridMeasurementService,
  type HybridMeasurementRequest,
  type HybridMeasurementResult,
} from "./HybridMeasurementService";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") ??
  "http://localhost:8787";

const DEFAULT_PROXY_PATH =
  process.env.EXPO_PUBLIC_MEASUREMENT_PROXY_PATH ?? "/api/measurements/hybrid";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function resolveProxyUrl(explicit?: string): string | null {
  const full =
    explicit?.trim() ?? process.env.EXPO_PUBLIC_MEASUREMENT_PROXY_URL?.trim();
  if (full) return full;
  if (process.env.EXPO_PUBLIC_MEASUREMENT_USE_API_PROXY === "true") {
    const path = DEFAULT_PROXY_PATH.startsWith("/")
      ? DEFAULT_PROXY_PATH
      : `/${DEFAULT_PROXY_PATH}`;
    return `${API_BASE}${path}`;
  }
  return null;
}

function allowClientSideProviders(): boolean {
  return process.env.EXPO_PUBLIC_ALLOW_CLIENT_MEASUREMENT === "true";
}

function validateRequest(req: HybridMeasurementRequest): void {
  if (!req.address?.trim()) throw new Error("address is required");
  if (!req.city?.trim()) throw new Error("city is required");
  if (!req.state?.trim()) throw new Error("state is required");
  if (!req.zipCode?.trim()) throw new Error("zipCode is required");
  if (!Number.isFinite(req.latitude) || !Number.isFinite(req.longitude)) {
    throw new Error("latitude and longitude must be finite numbers");
  }
}

function sanitizeResult(
  r: HybridMeasurementResult,
  includeRawPayloads: boolean,
): HybridMeasurementResult {
  if (includeRawPayloads) return r;
  const { nearmapRaw: _n, eagleViewRaw: _e, ...rest } = r;
  return rest;
}

export type ProductionMeasurementServiceOptions = {
  /** Full URL override; otherwise env-based resolution. */
  proxyUrl?: string;
  /** Called for `Authorization: Bearer` when calling the proxy. */
  getAccessToken?: () => Promise<string | undefined> | string | undefined;
  fetchImpl?: typeof fetch;
  /** Injected hybrid runner (tests / custom wiring). */
  hybrid?: HybridMeasurementService;
  /** Include `nearmapRaw` / `eagleViewRaw` in results (default false in production). */
  includeRawPayloads?: boolean;
  /** Retries for proxy 429/503 (default 1). */
  proxyRetries?: number;
};

export class ProductionMeasurementService {
  private readonly proxyUrl: string | null;
  private readonly getAccessToken?: ProductionMeasurementServiceOptions["getAccessToken"];
  private readonly fetchImpl: typeof fetch;
  private readonly hybrid: HybridMeasurementService;
  private readonly includeRawPayloads: boolean;
  private readonly proxyRetries: number;

  constructor(opts: ProductionMeasurementServiceOptions = {}) {
    this.proxyUrl = resolveProxyUrl(opts.proxyUrl);
    this.getAccessToken = opts.getAccessToken;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.hybrid = opts.hybrid ?? new HybridMeasurementService();
    this.includeRawPayloads = opts.includeRawPayloads ?? false;
    this.proxyRetries = Math.max(0, opts.proxyRetries ?? 1);
  }

  private async measureViaProxy(
    req: HybridMeasurementRequest,
  ): Promise<HybridMeasurementResult> {
    const url = this.proxyUrl!;
    const t0 = Date.now();
    let lastStatus = 0;
    let retries = 0;

    for (let attempt = 0; attempt <= this.proxyRetries; attempt++) {
      if (attempt > 0) {
        retries += 1;
        await sleep(300 * attempt);
      }

      const headers: HeadersInit = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (this.getAccessToken) {
        const tok = await this.getAccessToken();
        if (tok?.trim()) headers.Authorization = `Bearer ${tok.trim()}`;
      }

      const res = await this.fetchImpl(url, {
        method: "POST",
        headers,
        body: JSON.stringify(req),
      });

      lastStatus = res.status;

      const text = await res.text();
      let json: unknown;
      try {
        json = text ? JSON.parse(text) : undefined;
      } catch {
        throw new Error(
          `Measurement proxy returned non-JSON (${res.status}): ${text.slice(0, 200)}`,
        );
      }

      if (!res.ok) {
        if (
          (res.status === 429 || res.status === 503) &&
          attempt < this.proxyRetries
        ) {
          continue;
        }
        const msg =
          typeof json === "object" && json && "error" in json
            ? String((json as { error?: string }).error)
            : text;
        throw new Error(
          `Measurement proxy ${res.status}: ${msg || res.statusText}`,
        );
      }

      if (json === undefined || json === null || typeof json !== "object") {
        throw new Error(
          "Measurement proxy returned empty or invalid JSON body",
        );
      }

      const parsed = json as HybridMeasurementResult;
      return {
        ...parsed,
        retryCount: (parsed.retryCount ?? 0) + retries,
        processingTimeMs: (parsed.processingTimeMs ?? 0) + (Date.now() - t0),
      };
    }

    throw new Error(
      `Measurement proxy failed after retries (last HTTP ${lastStatus})`,
    );
  }

  /**
   * Validates input, then uses the backend proxy when configured; otherwise falls back
   * to `HybridMeasurementService` only if `EXPO_PUBLIC_ALLOW_CLIENT_MEASUREMENT` is enabled.
   */
  async measure(
    req: HybridMeasurementRequest,
  ): Promise<HybridMeasurementResult> {
    const t0 = Date.now();
    validateRequest(req);

    if (this.proxyUrl) {
      try {
        const out = await this.measureViaProxy(req);
        return sanitizeResult(out, this.includeRawPayloads);
      } catch (e) {
        if (!allowClientSideProviders()) {
          return {
            success: false,
            data: null,
            provider: "fallback",
            confidence: 0,
            errorMessage: e instanceof Error ? e.message : String(e),
            retryCount: 0,
            processingTimeMs: Date.now() - t0,
          };
        }
      }
    }

    if (!allowClientSideProviders()) {
      return {
        success: false,
        data: null,
        provider: "fallback",
        confidence: 0,
        errorMessage: this.proxyUrl
          ? "Measurement proxy failed and client-side providers are disabled (set EXPO_PUBLIC_ALLOW_CLIENT_MEASUREMENT=true to allow hybrid fallback)."
          : "No measurement proxy URL configured. Set EXPO_PUBLIC_MEASUREMENT_PROXY_URL or EXPO_PUBLIC_MEASUREMENT_USE_API_PROXY / EXPO_PUBLIC_API_URL, or enable EXPO_PUBLIC_ALLOW_CLIENT_MEASUREMENT for hybrid fallback.",
        retryCount: 0,
        processingTimeMs: Date.now() - t0,
      };
    }

    const out = await this.hybrid.measure(req);
    return sanitizeResult(out, this.includeRawPayloads);
  }
}

export function createProductionMeasurementServiceFromEnv(): ProductionMeasurementService {
  return new ProductionMeasurementService({
    includeRawPayloads:
      process.env.EXPO_PUBLIC_MEASUREMENT_INCLUDE_RAW_PAYLOADS === "true",
  });
}
