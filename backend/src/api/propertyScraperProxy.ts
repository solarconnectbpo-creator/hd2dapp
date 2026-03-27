/**
 * Proxy listing extraction to PropertyWebScraper public API.
 * Source: https://github.com/RealEstateWebTools/property_web_scraper
 */

export interface EnvPropertyScraperProxy {
  PROPERTY_SCRAPER_API_BASE_URL?: string;
}

export async function handlePropertyScraperListingProxy(
  request: Request,
  env: EnvPropertyScraperProxy,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const reqUrl = new URL(request.url);
  const listingUrl = reqUrl.searchParams.get("url")?.trim();
  if (!listingUrl) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing url query parameter" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const base =
    env.PROPERTY_SCRAPER_API_BASE_URL?.trim() ||
    "https://scraper.propertywebbuilder.com";
  const upstreamUrl = `${base.replace(/\/+$/, "")}/public_api/v1/listings?url=${encodeURIComponent(listingUrl)}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          e instanceof Error ? e.message : "Failed to reach property scraper",
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

