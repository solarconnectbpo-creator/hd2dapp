import { Link } from "react-router";
import { ArrowLeft, Layers, Palette, Target, Zap } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

/**
 * Ad maker automation — UI scaffold for creative variants, audiences, and export to ad platforms.
 */
export function AdMakerAutomation() {
  return (
    <div className="px-4 py-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4 text-black hover:bg-slate-100">
          <Link to="/marketing" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Marketing
          </Link>
        </Button>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-black sm:text-3xl">Ad maker automation</h1>
        <p className="max-w-3xl text-black/80">
          Generate and iterate ad copy and creative briefs from your roofing jobs and territories. Connect Meta / Google Ads
          APIs later for true campaign automation.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-black">Creative variants</CardTitle>
            </div>
            <CardDescription className="text-black/75">
              Headline + body + CTA combinations for A/B tests. Start from a template per service line (repair, replace,
              storm).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-black">Headline</span>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-black"
                  placeholder="e.g. Hail damage? Free roof inspection"
                  disabled
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-black">Primary CTA</span>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-black"
                  placeholder="Book inspection"
                  disabled
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-black">Body copy</span>
              <textarea
                className="min-h-[100px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-black"
                placeholder="Short value prop + offer + local proof…"
                disabled
              />
            </label>
            <p className="text-xs text-slate-600">
              Hook this form to an AI route on your HD2D Worker or a client-side template when you enable it.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-rose-600" />
                <CardTitle className="text-base text-black">Audiences</CardTitle>
              </div>
              <CardDescription className="text-black/75">Radius around canvass pins, ZIP lists, or storm polygons.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-black/85">
              Sync with Canvassing leads or import CSV — future: push as custom audiences where the platform allows.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-base text-black">Brand kit</CardTitle>
              </div>
              <CardDescription className="text-black/75">Logo and colors from Contacts &amp; settings.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-black/85">
              Pull <code className="rounded bg-slate-100 px-1">logoDataUrl</code> into exported creatives or HTML5 bundles.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-teal-600" />
                <CardTitle className="text-base text-black">Export</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-black/85">
              CSV / JSON lines for bulk editor tools; optional direct API placement in a later milestone.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
