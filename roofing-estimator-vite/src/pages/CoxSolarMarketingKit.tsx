import { useCallback } from "react";
import { Link } from "react-router";
import { ArrowLeft, Copy, ExternalLink, FileText, Printer, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import {
  COX_SOLAR_AD_COPY,
  COX_SOLAR_BRAND,
  COX_SOLAR_INCENTIVES,
  COX_SOLAR_LEAVEBEHIND_PATH,
  COX_SOLAR_PUBLIC_PATH,
  COX_SOLAR_TALK_TRACKS,
} from "../lib/cox/solarMarketing/coxSolarMarketingContent";
import { openCoxSolarMarketingPrint } from "../lib/cox/solarMarketing/buildCoxSolarMarketingHtml";

const cardChrome = "border-white/[0.07] ring-1 ring-white/[0.04]";

async function copyText(label: string, text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}`);
  } catch {
    toast.error("Could not copy — select the text instead.");
  }
}

/**
 * Authenticated closer kit: print leave-behinds, talk tracks, and ad copy for Cox Roofing Solar.
 */
export function CoxSolarMarketingKit() {
  const printGuide = useCallback(() => {
    if (!openCoxSolarMarketingPrint("guide")) {
      toast.error("Pop-up blocked — allow pop-ups to print the solar guide.");
    }
  }, []);

  const printLeavebehind = useCallback(() => {
    if (!openCoxSolarMarketingPrint("leavebehind")) {
      toast.error("Pop-up blocked — allow pop-ups to print the leave-behind.");
    }
  }, []);

  return (
    <div className="hd2d-page-shell">
      <div className="mb-6">
        <Button asChild variant="ghost" className="mb-3 -ml-2 gap-2 text-[#8b9199]">
          <Link to="/marketing">
            <ArrowLeft className="h-4 w-4" />
            Marketing
          </Link>
        </Button>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8b9199]">Cox Roofing</p>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-[var(--x-text)] sm:text-3xl">
          Solar closer kit
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[#8b9199]">
          Illinois homeowner guide, one-page door leave-behind, talk tracks, and ad copy. Share the public page or
          print to PDF.
        </p>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <Card className={`${cardChrome} border-red-500/20 bg-red-500/[0.06]`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sun className="h-4 w-4 text-red-400" aria-hidden />
              Homeowner page
            </CardTitle>
            <CardDescription className="text-[#8b9199]">
              Public URL homeowners and partners can open without signing in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full gap-2">
              <Link to={COX_SOLAR_PUBLIC_PATH} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open {COX_SOLAR_PUBLIC_PATH}
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className={cardChrome}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" aria-hidden />
              Full guide
            </CardTitle>
            <CardDescription className="text-[#8b9199]">
              Multi-page leave-behind: how solar works, incentives, FAQ.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="secondary" className="w-full gap-2" onClick={printGuide}>
              <Printer className="h-4 w-4" />
              Print / save PDF
            </Button>
          </CardContent>
        </Card>
        <Card className={cardChrome}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Printer className="h-4 w-4" aria-hidden />
              Door one-pager
            </CardTitle>
            <CardDescription className="text-[#8b9199]">
              Pitch, rebate bullets, Oak Brook phone. Fits one sheet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full gap-2">
                <Link to={COX_SOLAR_LEAVEBEHIND_PATH} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open {COX_SOLAR_LEAVEBEHIND_PATH}
                </Link>
              </Button>
              <Button type="button" variant="secondary" className="w-full gap-2" onClick={printLeavebehind}>
                <Printer className="h-4 w-4" />
                Print one-pager
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={`${cardChrome} mb-8`}>
        <CardHeader>
          <CardTitle className="text-base">Talk tracks</CardTitle>
          <CardDescription className="text-[#8b9199]">
            Roof-first language. Do not promise a rebate the utility has not confirmed.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {COX_SOLAR_TALK_TRACKS.map((track) => (
            <div key={track.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h2 className="text-sm font-semibold text-[var(--x-text)]">{track.title}</h2>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="shrink-0 gap-1 text-[#8b9199]"
                  onClick={() => void copyText(track.title, track.body)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </Button>
              </div>
              <p className="text-sm leading-relaxed text-[#b7bec6]">{track.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className={`${cardChrome} mb-8`}>
        <CardHeader>
          <CardTitle className="text-base">Ad / social copy</CardTitle>
          <CardDescription className="text-[#8b9199]">
            Paste into Ad maker or Social drafts. Keep the disclaimer on paid placements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {COX_SOLAR_AD_COPY.map((ad) => {
            const packed = [ad.headline, ad.body, ad.cta, COX_SOLAR_BRAND.phoneDisplay].join("\n\n");
            return (
              <div key={ad.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-semibold text-[var(--x-text)]">{ad.headline}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="shrink-0 gap-1 text-[#8b9199]"
                    onClick={() => void copyText(ad.headline, packed)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
                <p className="text-sm leading-relaxed text-[#b7bec6]">{ad.body}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-sky-400">{ad.cta}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className={cardChrome}>
        <CardHeader>
          <CardTitle className="text-base">Incentive cheat sheet</CardTitle>
          <CardDescription className="text-[#8b9199]">
            Same rows as the homeowner guide. Confirm current utility and city terms before you quote.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {COX_SOLAR_INCENTIVES.map((row) => (
            <div key={row.id} className="border-b border-white/[0.06] pb-3 last:border-0 last:pb-0">
              <p className="text-sm font-semibold text-[var(--x-text)]">{row.name}</p>
              <p className="text-xs uppercase tracking-wide text-[#c8102e]">{row.kindLabel}</p>
              <p className="mt-1 text-sm leading-relaxed text-[#8b9199]">{row.summary}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
