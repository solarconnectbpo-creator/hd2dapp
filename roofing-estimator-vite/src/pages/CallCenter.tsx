import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, ExternalLink, Headphones } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type ExtraReport = { label: string; url: string };

const cardChrome = "border-white/[0.07] ring-1 ring-white/[0.04]";
const codeChip = "rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs text-[#e7e9ea]";

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
  const [showEmbed, setShowEmbed] = useState(false);

  const openRealtime = () => {
    if (!realtimeUrl) return;
    window.open(realtimeUrl, "_blank", "noopener,noreferrer");
  };

  const copyRealtimeUrl = async () => {
    if (!realtimeUrl) return;
    try {
      await navigator.clipboard.writeText(realtimeUrl);
      toast.success("Report URL copied");
    } catch {
      toast.error("Could not copy — select the URL from your browser if needed.");
    }
  };

  return (
    <div className="hd2d-page-shell max-w-4xl">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 inline-flex items-center gap-2 text-sm font-medium text-sky-400">
            <Headphones className="h-4 w-4" aria-hidden />
            Call center
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-black">Reports &amp; live monitoring</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#8b9199]">
            Open your VICIdial / Gradient realtime view in a new tab (recommended). Embedded previews are often blocked by the
            remote host — that is expected.
          </p>
        </div>
      </div>

      <Card className={`mb-6 ${cardChrome}`}>
        <CardHeader>
          <CardTitle className="text-black">Realtime report</CardTitle>
          <CardDescription className="text-[#8b9199]">
            Log in on the call-center host if prompted. This app does not store your VICIdial credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {realtimeUrl ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="gap-2"
                  onClick={openRealtime}
                  aria-label="Open call center realtime report in a new tab"
                >
                  Open realtime report
                  <ExternalLink className="h-4 w-4" aria-hidden />
                </Button>
                <Button type="button" variant="outline" className="gap-2" onClick={() => void copyRealtimeUrl()}>
                  <Copy className="h-4 w-4" aria-hidden />
                  Copy URL
                </Button>
              </div>
              <div>
                <button
                  type="button"
                  className="mb-2 flex w-full items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-left text-sm font-medium text-black transition hover:bg-white/[0.06] sm:w-auto"
                  onClick={() => setShowEmbed((v) => !v)}
                  aria-expanded={showEmbed}
                >
                  {showEmbed ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-[#8b9199]" aria-hidden />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#8b9199]" aria-hidden />
                  )}
                  Show embedded preview
                </button>
                {showEmbed ? (
                  <div>
                    <p className="mb-2 text-xs text-[#8b9199]">
                      If this area stays blank, the report host is blocking iframes — use Open realtime report or Copy URL
                      above.
                    </p>
                    <div className="aspect-[16/10] min-h-[240px] w-full overflow-hidden rounded-lg border border-white/[0.08] bg-black/20">
                      <iframe
                        title="Call center realtime report"
                        src={realtimeUrl}
                        className="h-full min-h-[240px] w-full border-0"
                        loading="lazy"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
              role="status"
            >
              Set <code className={codeChip}>VITE_CALLCENTER_REALTIME_REPORT_URL</code> in your environment (see{" "}
              <code className={codeChip}>.env.example</code>).
            </div>
          )}
        </CardContent>
      </Card>

      {extras.length > 0 ? (
        <Card className={cardChrome}>
          <CardHeader>
            <CardTitle className="text-black">More reports</CardTitle>
            <CardDescription className="text-[#8b9199]">Additional links from configuration.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {extras.map((r) => (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-sky-400 hover:underline"
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
