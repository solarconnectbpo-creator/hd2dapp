/**
 * Placeholder for EagleView Property Data API v2 proxy.
 * OAuth2 + API calls must run here (or another server), never in the Expo bundle.
 *
 * @see https://developer.eagleview.com/documentation/property-data/v2/api-documentation
 */
export async function handleEagleViewPropertyDataProxy(
  _request: Request,
  _env: unknown,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  return new Response(
    JSON.stringify({
      error: "not_implemented",
      message:
        "Implement OAuth client-credentials and forward requests to EagleView Property Data v2 from this worker. Keep client_id / client_secret in Worker secrets only.",
      documentation:
        "https://developer.eagleview.com/documentation/property-data/v2/api-documentation",
    }),
    {
      status: 501,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
