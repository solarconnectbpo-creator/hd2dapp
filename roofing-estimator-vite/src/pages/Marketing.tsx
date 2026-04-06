import { Link } from "react-router";
import { BookOpen, ExternalLink, Megaphone, Share2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { HugoDocsLocalPanel } from "../components/marketing/HugoDocsLocalPanel";
import { HUGO_DOCS_REPO, HUGO_DOCS_SITE } from "../config/hugoMarketingRefs";

const cardChrome = "border-white/[0.07] ring-1 ring-white/[0.04]";

/**
 * Marketing hub — links to Hugo documentation (static sites / content workflows) and in-app automation sections.
 */
export function Marketing() {
  return (
    <div className="hd2d-page-shell">
      <div className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8b9199]">Growth</p>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-black sm:text-3xl">Marketing &amp; growth</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[#8b9199]">
          Content publishing references, social posting, and ad workflows — connect APIs and automations when you are ready.
        </p>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <Card className={cardChrome}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-sky-400" aria-hidden />
              <CardTitle className="text-black">Hugo documentation (reference)</CardTitle>
            </div>
            <CardDescription className="text-[#8b9199]">
              The official Hugo docs source lives in the open-source{" "}
              <span className="font-medium text-black">hugoDocs</span> repository — useful for static marketing sites,
              landing pages, and structured content pipelines (not bundled inside this app).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={HUGO_DOCS_SITE} target="_blank" rel="noreferrer" className="gap-1.5">
                gohugo.io
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={HUGO_DOCS_REPO} target="_blank" rel="noreferrer" className="gap-1.5">
                hugoDocs on GitHub
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className={`${cardChrome} border-emerald-500/20 bg-emerald-500/[0.06]`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-emerald-400" aria-hidden />
              <CardTitle className="text-black">In-app tools</CardTitle>
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
          <CardTitle className="text-base text-black">Hugo documentation source (clone locally)</CardTitle>
          <CardDescription className="text-[#8b9199]">
            Pull the official docs repo to build Hugo sites alongside ad and social workflows in this app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HugoDocsLocalPanel />
        </CardContent>
      </Card>

      <Card className={cardChrome}>
        <CardHeader>
          <CardTitle className="text-base text-black">Suggested rollout</CardTitle>
          <CardDescription className="text-[#8b9199]">
            1) Publish static campaign pages with Hugo if you need versioned marketing content. 2) Draft posts and ad
            variants in the sections below. 3) Connect OAuth / API keys in environment or a future settings panel.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
