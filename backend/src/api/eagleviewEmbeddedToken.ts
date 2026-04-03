import { getEagleViewServiceBearer } from "./eagleviewOAuth";

type CorsHeaders = Record<string, string>;

export interface EagleViewEmbeddedTokenEnv {
  EAGLEVIEW_EMBEDDED_CLIENT_ID?: string;
  EAGLEVIEW_EMBEDDED_CLIENT_SECRET?: string;
  EAGLEVIEW_EMBEDDED_TOKEN_URL?: string;
  EAGLEVIEW_EMBEDDED_SCOPE?: string;
  EAGLEVIEW_EMBEDDED_ACCESS_TOKEN?: string;
  EAGLEVIEW_CLIENT_ID?: string;
  EAGLEVIEW_OAUTH_CLIENT_ID?: string;
  EAGLEVIEW_CLIENT_SECRET?: string;
  EAGLEVIEW_SCOPE?: string;
}

function json(data: unknown, status: number, cors: CorsHeaders): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export async function handleEagleViewEmbeddedToken(
  request: Request,
  env: EagleViewEmbeddedTokenEnv,
  corsHeaders: CorsHeaders,
): Promise<Response> {
  if (request.method !== "GET") {
    return json({ success: false, error: "Method not allowed" }, 405, corsHeaders);
  }

  const result = await getEagleViewServiceBearer(env as Record<string, unknown>, {
    cacheKey: "eagleview-embedded",
    clientIdKeys: [
      "EAGLEVIEW_EMBEDDED_CLIENT_ID",
      "EAGLEVIEW_OAUTH_CLIENT_ID",
      "EAGLEVIEW_CLIENT_ID",
    ],
    clientSecretKeys: ["EAGLEVIEW_EMBEDDED_CLIENT_SECRET", "EAGLEVIEW_CLIENT_SECRET"],
    tokenUrlKeys: ["EAGLEVIEW_EMBEDDED_TOKEN_URL"],
    scopeKeys: ["EAGLEVIEW_EMBEDDED_SCOPE", "EAGLEVIEW_SCOPE"],
    staticTokenKeys: ["EAGLEVIEW_EMBEDDED_ACCESS_TOKEN"],
    defaultTokenUrl: "https://api.eagleview.com/auth-service/v1/token",
  });

  if (!result.ok) {
    const detail = result.error;
    const isMissingCreds = /missing eagleview client credentials/i.test(detail);
    const isRejectedCreds = /rejected client credentials/i.test(detail) || /\(401\)/.test(detail);
    const error = isMissingCreds
      ? "EagleView Embedded Explorer is not configured on this Worker. Set EAGLEVIEW_EMBEDDED_CLIENT_ID and EAGLEVIEW_EMBEDDED_CLIENT_SECRET (or shared EAGLEVIEW_CLIENT_ID/EAGLEVIEW_CLIENT_SECRET), and optionally EAGLEVIEW_EMBEDDED_TOKEN_URL/EAGLEVIEW_EMBEDDED_SCOPE."
      : isRejectedCreds
        ? "EagleView Embedded Explorer credentials were provided but rejected by EagleView auth (401). Verify the Embedded client ID/secret pair and token URL for this environment."
        : "EagleView Embedded Explorer token generation failed. Verify embedded token URL/scope and credential configuration.";
    return json(
      {
        success: false,
        error,
        detail,
      },
      503,
      corsHeaders,
    );
  }

  return json(
    {
      success: true,
      access_token: result.token,
      token_type: "Bearer",
      expires_in: result.expiresInSec,
    },
    200,
    corsHeaders,
  );
}
