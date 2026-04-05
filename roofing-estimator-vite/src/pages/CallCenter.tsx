import { ExternalLink, Headphones } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type ExtraReport = { label: string; url: string };

function getRealtimeReportUrl(): string {
  const raw = import.meta.env.VITE_CALLCENTER_REALTIME_REPORT_URL;
  if (typeof raw !== "string") return "";
  return raw.trim();
}

function parseExtraReports(): ExtraReport[] {
  const raw = import.meta.env.VITE_CALLCENTER_EXTRA_REPORTS_JSON;
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: ExtraReport[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      if (typeof o.label !== "string" || typeof o.url !== "string") continue;
      try {
        const u = new URL(o.url);
        if (u.protocol === "http:" || u.protocol === "https:") out.push({ label: o.label, url: o.url });
      } catch {
        continue;
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function CallCenter() {
  const realtimeUrl = getRealtimeReportUrl();
  const extras = parseExtraReports();

  const openRealtime = () => {
    if (!realtimeUrl) return;
    window.open(realtimeUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="hd2d-page-shell max-w-4xl text-black">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 inline-flex items-center gap-2 text-sm font-medium text-sky-700">
            <Headphones className="h-4 w-4" aria-hidden />
            Call center
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Reports &amp; live monitoring</h1>
          <p className="mt-1 max-w-2xl text-sm text-black/70">
            Open your VICIdial / Gradient realtime view in a new tab (recommended). An embedded preview is available below;
            many hosts block iframes — if the area stays blank, use the button.
          </p>
        </div>
      </div>

      <Card className="mb-6 border-slate-200">
        <CardHeader>
          <CardTitle>Realtime report</CardTitle>
          <CardDescription>
            Log in on the call-center host if prompted. This app does not store your VICIdial credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {realtimeUrl ? (
            <>
              <Button
                type="button"
                className="w-full gap-2 sm:w-auto"
                onClick={openRealtime}
              >
                Open realtime report
                <ExternalLink className="h-4 w-4" aria-hidden />
              </Button>
              <div>
                <p className="mb-2 text-xs text-black/60">Embedded preview (may be empty if the remote site blocks framing):</p>
                <div className="aspect-[16/10] min-h-[240px] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  <iframe
                    title="Call center realtime report"
                    src={realtimeUrl}
                    className="h-full min-h-[240px] w-full border-0"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-amber-900">
              Set <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">VITE_CALLCENTER_REALTIME_REPORT_URL</code> in
              your environment (see <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">.env.example</code>).
            </p>
          )}
        </CardContent>
      </Card>

      {extras.length > 0 ? (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>More reports</CardTitle>
            <CardDescription>Additional links from configuration.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {extras.map((r) => (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:underline"
              >
                {r.label}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </a>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
