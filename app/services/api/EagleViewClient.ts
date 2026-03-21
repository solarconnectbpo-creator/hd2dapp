/**
 * EagleView REST client (measurement orders / reports).
 *
 * Official docs: https://restdoc.eagleview.com/ — endpoint paths and payloads
 * differ by product tier; adjust `paths` below after your integration is provisioned.
 *
 * Security: do **not** ship OAuth client secrets in the mobile/web bundle. Prefer
 * a backend proxy that holds credentials and forwards requests, or inject short‑lived
 * tokens from your server.
 */

const DEFAULT_API_BASE =
  process.env.EXPO_PUBLIC_EAGLEVIEW_API_BASE_URL ??
  "https://webservices-integrations.eagleview.com";

const DEFAULT_TOKEN_URL =
  process.env.EXPO_PUBLIC_EAGLEVIEW_TOKEN_URL ??
  "https://webservices-integrations.eagleview.com/oauth/token";

/** Override in env if your integration uses different routes (see restdoc). */
const paths = {
  /** Placeholder — replace with your provisioned measurement-order path. */
  orders:
    process.env.EXPO_PUBLIC_EAGLEVIEW_PATH_ORDERS ??
    "/api/v1/measurement-orders",
  orderById: (id: string) => {
    const prefix =
      process.env.EXPO_PUBLIC_EAGLEVIEW_PATH_ORDERS_PREFIX ??
      "/api/v1/measurement-orders";
    return `${prefix.replace(/\/+$/, "")}/${encodeURIComponent(id)}`;
  },
} as const;

export interface EagleViewAddressPayload {
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface EagleViewPlaceOrderRequest {
  address: EagleViewAddressPayload;
  /** Optional product / report identifiers from your EagleView contract. */
  productCode?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

export interface EagleViewPlaceOrderResponse {
  orderId: string;
  status?: string;
  raw?: unknown;
}

export interface EagleViewOrderStatusResponse {
  orderId: string;
  status: string;
  /** Report download URLs when `status` indicates complete (shape varies by product). */
  files?: { type: string; url: string }[];
  raw?: unknown;
}

export type EagleViewClientOptions = {
  /** API root (integration / sandbox / prod). */
  apiBaseUrl?: string;
  /** OAuth2 token endpoint (client-credentials flow). */
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  /**
   * Static bearer (e.g. from your backend). If set, OAuth fields are ignored.
   * `EXPO_PUBLIC_EAGLEVIEW_ACCESS_TOKEN` is used when this and getAccessToken are absent.
   */
  accessToken?: string;
  /** Dynamic token (e.g. refresh from secure storage or backend). */
  getAccessToken?: () => Promise<string | undefined> | string | undefined;
  fetchImpl?: typeof fetch;
};

type CachedToken = { token: string; expiresAtMs: number };

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
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

export class EagleViewClient {
  private readonly apiBaseUrl: string;
  private readonly tokenUrl: string;
  private readonly clientId?: string;
  private readonly clientSecret?: string;
  private readonly scope?: string;
  private readonly staticToken?: string;
  private readonly getAccessToken?: EagleViewClientOptions["getAccessToken"];
  private readonly fetchImpl: typeof fetch;

  private cached: CachedToken | null = null;

  constructor(opts: EagleViewClientOptions = {}) {
    this.apiBaseUrl = opts.apiBaseUrl ?? DEFAULT_API_BASE;
    this.tokenUrl = opts.tokenUrl ?? DEFAULT_TOKEN_URL;
    this.clientId =
      opts.clientId ?? process.env.EXPO_PUBLIC_EAGLEVIEW_CLIENT_ID;
    this.clientSecret =
      opts.clientSecret ?? process.env.EXPO_PUBLIC_EAGLEVIEW_CLIENT_SECRET;
    this.scope = opts.scope ?? process.env.EXPO_PUBLIC_EAGLEVIEW_SCOPE;
    this.staticToken =
      opts.accessToken ?? process.env.EXPO_PUBLIC_EAGLEVIEW_ACCESS_TOKEN;
    this.getAccessToken = opts.getAccessToken;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async resolveBearer(): Promise<string> {
    if (this.getAccessToken) {
      const t = await this.getAccessToken();
      if (t) return t;
    }
    if (this.staticToken?.trim()) return this.staticToken.trim();

    if (this.clientId && this.clientSecret) {
      const now = Date.now();
      if (this.cached && this.cached.expiresAtMs > now + 30_000) {
        return this.cached.token;
      }
      const body = new URLSearchParams();
      body.set("grant_type", "client_credentials");
      body.set("client_id", this.clientId);
      body.set("client_secret", this.clientSecret);
      if (this.scope) body.set("scope", this.scope);

      const res = await this.fetchImpl(this.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      const json = (await readJson(res)) as Record<string, unknown> | undefined;
      if (!res.ok) {
        throw new Error(
          `EagleView token error ${res.status}: ${JSON.stringify(json)}`,
        );
      }
      const accessToken = json?.access_token;
      const expiresIn = Number(json?.expires_in ?? 3600);
      if (typeof accessToken !== "string" || !accessToken) {
        throw new Error("EagleView token response missing access_token");
      }
      this.cached = {
        token: accessToken,
        expiresAtMs: now + Math.max(60, expiresIn) * 1000,
      };
      return accessToken;
    }

    throw new Error(
      "EagleViewClient: configure accessToken, getAccessToken, or clientId+clientSecret (prefer server proxy for secrets).",
    );
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const bearer = await this.resolveBearer();
    const url = joinUrl(this.apiBaseUrl, path);
    const res = await this.fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${bearer}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const payload = await readJson(res);
    if (!res.ok) {
      throw new Error(
        `EagleView ${method} ${path} failed ${res.status}: ${JSON.stringify(payload)}`,
      );
    }
    return payload as T;
  }

  /**
   * Submit a measurement order. **Payload shape must match your provisioned EagleView contract**
   * (see restdoc). This uses a generic JSON body.
   */
  async placeOrder(
    req: EagleViewPlaceOrderRequest,
  ): Promise<EagleViewPlaceOrderResponse> {
    const raw = await this.request<Record<string, unknown>>(
      "POST",
      paths.orders,
      req as unknown as Record<string, unknown>,
    );
    const orderId = String(
      raw.orderId ?? raw.OrderId ?? raw.id ?? raw.Id ?? "",
    );
    return {
      orderId,
      status:
        typeof raw.status === "string"
          ? raw.status
          : typeof raw.Status === "string"
            ? raw.Status
            : undefined,
      raw,
    };
  }

  /** Poll order / report status (path from `paths.orderById`). */
  async getOrderStatus(orderId: string): Promise<EagleViewOrderStatusResponse> {
    const raw = await this.request<Record<string, unknown>>(
      "GET",
      paths.orderById(orderId),
    );
    const id = String(raw.orderId ?? raw.OrderId ?? orderId);
    const status = String(raw.status ?? raw.Status ?? "unknown");
    return { orderId: id, status, raw };
  }
}

export function createEagleViewClientFromEnv(): EagleViewClient {
  return new EagleViewClient();
}
