import { Link } from "react-router";
import { ArrowLeft, CalendarClock, Hash, ImageIcon, MessageSquare, Repeat } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

/**
 * Social media posting & automation — UI scaffold for queues, templates, and future provider hooks.
 */
export function SocialMediaAutomation() {
  return (
    <div className="px-4 py-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4 text-black hover:bg-slate-100">
          <Link to="/marketing" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Marketing
          </Link>
        </Button>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-black sm:text-3xl">Social media posting &amp; automation</h1>
        <p className="max-w-3xl text-black/80">
          Plan content, reuse templates, and (later) push to networks via APIs or automation runners. Nothing is sent until you
          connect credentials.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-sky-600" />
              <CardTitle className="text-black">Content queue</CardTitle>
            </div>
            <CardDescription className="text-black/75">
              Draft posts with optional schedule slots. Persist to browser storage or your backend when you add an API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-black/90">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-black">Next post draft</span>
              <textarea
                className="min-h-[120px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-black placeholder:text-slate-400"
                placeholder="e.g. Storm season roof check — book a free inspection in [city]…"
                disabled
              />
              <span className="mt-1 block text-xs text-slate-500">Enable by wiring save + list UI (localStorage or Worker).</span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-violet-600" />
              <CardTitle className="text-black">Automation</CardTitle>
            </div>
            <CardDescription className="text-black/75">
              Triggers: new estimate closed, job completed, review received — map to social actions in a future workflow engine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-black/90">
              <li className="flex items-start gap-2">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                Webhook or cron → generate caption from measurement summary
              </li>
              <li className="flex items-start gap-2">
                <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                Attach before/after or aerial stills when assets exist
              </li>
              <li className="flex items-start gap-2">
                <Hash className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                Territory hashtags / brand tags from org settings
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
