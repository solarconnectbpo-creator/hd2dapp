import { Link } from "react-router";
import { BookOpen, ExternalLink, Megaphone, Share2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";

const HUGO_DOCS_SITE = "https://gohugo.io/";
const HUGO_DOCS_REPO = "https://github.com/gohugoio/hugoDocs";

/**
 * Marketing hub — links to Hugo documentation (static sites / content workflows) and in-app automation sections.
 */
export function Marketing() {
  return (
    <div className="px-4 py-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-black sm:text-3xl">Marketing &amp; growth</h1>
        <p className="text-black/80">
          Content publishing references, social posting, and ad workflows — expand these sections as you connect APIs and
          automations.
        </p>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-slate-700" aria-hidden />
              <CardTitle className="text-black">Hugo documentation (reference)</CardTitle>
            </div>
            <CardDescription className="text-black/70">
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

        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-emerald-800" aria-hidden />
              <CardTitle className="text-black">In-app tools</CardTitle>
            </div>
            <CardDescription className="text-black/80">
              Dedicated workspaces for social scheduling and ad creative automation — wire your providers (Meta, Google,
              Buffer-style APIs) when ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="gap-2 bg-zinc-900 text-white hover:bg-zinc-800">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-black">Suggested rollout</CardTitle>
          <CardDescription className="text-black/75">
            1) Publish static campaign pages with Hugo if you need versioned marketing content. 2) Draft posts and ad
            variants in the sections below. 3) Connect OAuth / API keys in environment or a future settings panel.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
