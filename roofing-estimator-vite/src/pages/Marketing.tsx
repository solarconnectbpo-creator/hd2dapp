import { Link } from "react-router";
import { Megaphone, Share2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";

const cardChrome = "border-white/[0.07] ring-1 ring-white/[0.04]";

/** Marketing hub — in-app automation sections for social and ads. */
export function Marketing() {
  return (
    <div className="hd2d-page-shell">
      <div className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8b9199]">Growth</p>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-[var(--x-text)] sm:text-3xl">Marketing &amp; growth</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[#8b9199]">
          Social posting, ad workflows, and content tools — connect APIs and automations when you are ready.
        </p>
      </div>

      <div className="mb-8">
        <Card className={`${cardChrome} border-emerald-500/20 bg-emerald-500/[0.06] max-w-2xl`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-emerald-400" aria-hidden />
              <CardTitle>In-app tools</CardTitle>
            </div>
            <CardDescription className="text-[#8b9199]">
              Draft social posts and ad copy in the browser; add Meta, Google, or Buffer-style APIs when you wire credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="gap-2">
              <Link to="/marketing/social">
                <Share2 className="h-4 w-4" />
                Social media &amp; automation
              </Link>
            </Button>
            <Button asChild variant="secondary" className="gap-2">
              <Link to="/marketing/ads">
                <Sparkles className="h-4 w-4" />
                Ad maker automation
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className={cardChrome}>
        <CardHeader>
          <CardTitle className="text-base">Suggested rollout</CardTitle>
          <CardDescription className="text-[#8b9199]">
            1) Version campaign pages and landing content where you host static marketing. 2) Draft posts and ad variants in
            the sections below. 3) Connect OAuth / API keys in environment or a future settings panel.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
