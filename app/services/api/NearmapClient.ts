/**
 * Nearmap REST client (Tile API + Coverage API).
 *
 * Docs: https://developer.nearmap.com/docs/tile-api
 *       https://developer.nearmap.com/docs/coverage-api
 *
 * Authentication: API key via `Authorization: Apikey <key>` or `apikey` query param.
 * Do **not** expose production keys in public clients — prefer a backend proxy for production.
 */

const DEFAULT_API_BASE = "https://api.nearmap.com";

const TILES_PREFIX =
  process.env.EXPO_PUBLIC_NEARMAP_TILES_PREFIX ?? "/tiles/v3";
const COVERAGE_PREFIX =
  process.env.EXPO_PUBLIC_NEARMAP_COVERAGE_PREFIX ?? "/coverage/v2";

export type NearmapTileFormat = "jpg" | "png" | "img";

/** Vertical / cardinal panorama tile resource types (case-sensitive). */
export type NearmapContentType =
  | "Vert"
  | "North"
  | "South"
  | "East"
  | "West"
  | (string & {});

export interface NearmapClientOptions {
  apiBaseUrl?: string;
  /** Defaults to `EXPO_PUBLIC_NEARMAP_API_KEY`. */
  apiKey?: string;
  getApiKey?: () => Promise<string | undefined> | string | undefined;
  fetchImpl?: typeof fetch;
}

export interface NearmapCoverageQuery {
  since?: string;
  until?: string;
  resources?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  fields?: string;
  include?: string;
  exclude?: string;
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function appendApiKey(url: string, apiKey: string): string {
  const u = new URL(url);
  u.searchParams.set("apikey", apiKey);
  return u.toString();
}

export class NearmapClient {
  private readonly apiBaseUrl: string;
  private readonly staticKey?: string;
  private readonly getApiKey?: NearmapClientOptions["getApiKey"];
  private readonly fetchImpl: typeof fetch;

  constructor(opts: NearmapClientOptions = {}) {
    this.apiBaseUrl = opts.apiBaseUrl ?? DEFAULT_API_BASE;
    this.staticKey =
      opts.apiKey ?? process.env.EXPO_PUBLIC_NEARMAP_API_KEY ?? undefined;
    this.getApiKey = opts.getApiKey;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async resolveApiKey(): Promise<string> {
    if (this.getApiKey) {
      const k = await this.getApiKey();
      if (k?.trim()) return k.trim();
    }
    if (this.staticKey?.trim()) return this.staticKey.trim();
    throw new Error(
      "NearmapClient: set apiKey, EXPO_PUBLIC_NEARMAP_API_KEY, or getApiKey (prefer server proxy for production).",
    );
  }

  private authHeader(apiKey: string): HeadersInit {
    return { Authorization: `Apikey ${apiKey}` };
  }

  /**
   * Latest imagery tile (no survey id). Path:
   * `/tiles/v3/{contentType}/{z}/{x}/{y}.{format}`
   */
  buildLatestTileUrl(opts: {
    contentType: NearmapContentType;
    z: number;
    x: number;
    y: number;
    format: NearmapTileFormat;
    /** If true, append `apikey` for use in `<img src>` (cannot send headers). */
    includeApiKeyInQuery?: boolean;
  }): string {
    const { contentType, z, x, y, format, includeApiKeyInQuery } = opts;
    const path = `${TILES_PREFIX}/${contentType}/${z}/${x}/${y}.${format}`;
    const url = joinUrl(this.apiBaseUrl, path);
    if (includeApiKeyInQuery) {
      const key = this.staticKey?.trim();
      if (!key) {
        throw new Error(
          "buildLatestTileUrl: includeApiKeyInQuery requires a static apiKey (getApiKey is async).",
        );
      }
      return appendApiKey(url, key);
    }
    return url;
  }

  /**
   * Tile from a specific survey (id from Coverage API). Path:
   * `/tiles/v3/surveys/{surveyId}/{contentType}/{z}/{x}/{y}.{format}`
   */
  buildSurveyTileUrl(opts: {
    surveyId: string;
    contentType: NearmapContentType;
    z: number;
    x: number;
    y: number;
    format: NearmapTileFormat;
    includeApiKeyInQuery?: boolean;
  }): string {
    const { surveyId, contentType, z, x, y, format, includeApiKeyInQuery } =
      opts;
    const path = `${TILES_PREFIX}/surveys/${encodeURIComponent(surveyId)}/${contentType}/${z}/${x}/${y}.${format}`;
    const url = joinUrl(this.apiBaseUrl, path);
    if (includeApiKeyInQuery) {
      const key = this.staticKey?.trim();
      if (!key) {
        throw new Error(
          "buildSurveyTileUrl: includeApiKeyInQuery requires a static apiKey.",
        );
      }
      return appendApiKey(url, key);
    }
    return url;
  }

  /**
   * Fetch a tile image with `Authorization: Apikey` (preferred over query string when possible).
   */
  async fetchLatestTile(
    opts: Parameters<NearmapClient["buildLatestTileUrl"]>[0],
  ): Promise<ArrayBuffer> {
    const key = await this.resolveApiKey();
    const url = this.buildLatestTileUrl({
      ...opts,
      includeApiKeyInQuery: false,
    });
    const res = await this.fetchImpl(url, {
      headers: {
        ...this.authHeader(key),
        Accept: "image/*",
      },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(
        `Nearmap tile ${res.status}: ${errText || res.statusText}`,
      );
    }
    return res.arrayBuffer();
  }

  /**
   * Coverage: survey resources at a slippy tile index.
   * `GET /coverage/v2/coord/{z}/{x}/{y}`
   */
  async getCoverageByTile(
    z: number,
    x: number,
    y: number,
    query?: NearmapCoverageQuery,
  ): Promise<unknown> {
    const key = await this.resolveApiKey();
    const path = `${COVERAGE_PREFIX}/coord/${z}/${x}/${y}`;
    let url = joinUrl(this.apiBaseUrl, path);
    if (query) {
      const u = new URL(url);
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
      }
      url = u.toString();
    }
    const res = await this.fetchImpl(url, {
      headers: {
        ...this.authHeader(key),
        Accept: "application/json",
      },
    });
    const payload = await readJson(res);
    if (!res.ok) {
      throw new Error(
        `Nearmap coverage ${res.status}: ${JSON.stringify(payload)}`,
      );
    }
    return payload;
  }
}

export function createNearmapClientFromEnv(): NearmapClient {
  return new NearmapClient();
}
