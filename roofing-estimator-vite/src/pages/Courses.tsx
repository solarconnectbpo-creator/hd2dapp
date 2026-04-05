import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  BookOpen,
  Clock,
  ExternalLink,
  GraduationCap,
  Layers,
  Play,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import {
  DEFAULT_COURSES_CATALOG,
  resolveTrailerYoutubeId,
  type CourseProgram,
  type CoursesCatalogData,
} from "../data/coursesCatalog";
import { fetchCoursesCatalog } from "../lib/coursesCatalogClient";
import { useAuth } from "../context/AuthContext";

function ProgramCard({
  program,
  onComingSoon,
}: {
  program: CourseProgram;
  onComingSoon: (title: string) => void;
}) {
  const hasHref = Boolean(program.href?.trim());

  return (
    <Card className="flex h-full flex-col border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base leading-snug text-black">{program.title}</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-black/70">
          <span className="inline-flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" aria-hidden />
            {program.lessonCount} lesson{program.lessonCount !== 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {program.durationLabel}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto pt-0">
        {hasHref ? (
          <Button variant="default" size="sm" className="w-full gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800" asChild>
            <a href={program.href} target="_blank" rel="noopener noreferrer">
              Open lesson
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => onComingSoon(program.title)}
          >
            Coming soon
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function Courses() {
  const { session } = useAuth();
  const token = session?.token ?? "";
  const [catalog, setCatalog] = useState<CoursesCatalogData>(DEFAULT_COURSES_CATALOG);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogNotice, setCatalogNotice] = useState("");
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [comingSoonProgram, setComingSoonProgram] = useState<string | null>(null);
  const trailerId = resolveTrailerYoutubeId(catalog);

  useEffect(() => {
    if (!token) {
      setCatalog(DEFAULT_COURSES_CATALOG);
      setCatalogLoading(false);
      setCatalogNotice("");
      return;
    }
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogNotice("");
    void (async () => {
      try {
        const { catalog: remote } = await fetchCoursesCatalog(token);
        if (cancelled) return;
        setCatalog(remote ?? DEFAULT_COURSES_CATALOG);
      } catch (e) {
        if (cancelled) return;
        setCatalog(DEFAULT_COURSES_CATALOG);
        setCatalogNotice(e instanceof Error ? e.message : "Could not load catalog from server.");
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="hd2d-page-shell">
      {catalogNotice ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="status">
          Showing built-in catalog: {catalogNotice}
        </div>
      ) : null}
      {catalogLoading ? (
        <p className="mb-6 text-sm text-black/60" aria-live="polite">
          Loading catalog…
        </p>
      ) : null}
      {/* Hero */}
      <section className="relative mb-12 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-12 text-white sm:px-10 sm:py-16">
        <div className="relative z-10 max-w-3xl">
          <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-sky-300">
            <GraduationCap className="h-4 w-4" aria-hidden />
            HD2D Skill Hub
          </p>
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">{catalog.hero.headline}</h1>
          <p className="mb-8 text-lg text-slate-300">{catalog.hero.subhead}</p>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="bg-sky-500 text-white hover:bg-sky-600"
            >
              <Link to={catalog.hero.primaryCtaPath}>{catalog.hero.primaryCtaLabel}</Link>
            </Button>
            {trailerId ? (
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="border-slate-500 bg-transparent text-white hover:bg-white/10"
                onClick={() => setTrailerOpen(true)}
              >
                <Play className="mr-2 h-4 w-4" />
                Watch trailer
              </Button>
            ) : null}
          </div>
        </div>
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl"
          aria-hidden
        />
      </section>

      {/* Value pillars */}
      <section className="mb-14 grid gap-6 sm:grid-cols-3">
        {catalog.valueProps.map((p) => (
          <Card key={p.title} className="border-slate-200 bg-slate-50/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-black">
                <Sparkles className="h-5 w-5 text-amber-500" aria-hidden />
                {p.title}
              </CardTitle>
              <CardDescription className="text-base leading-relaxed text-black/75">{p.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      {/* Narrative */}
      <section className="mb-14 text-center">
        <h2 className="mb-3 text-2xl font-semibold text-black sm:text-3xl">{catalog.narrativeBand.title}</h2>
        <p className="mx-auto max-w-2xl text-black/75">{catalog.narrativeBand.body}</p>
      </section>

      {/* Category grids */}
      <div className="mb-14 space-y-14">
        {catalog.categories.map((cat) => (
          <section key={cat.id} id={cat.id}>
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-black">{cat.title}</h2>
                {cat.description ? (
                  <p className="mt-1 max-w-2xl text-black/70">{cat.description}</p>
                ) : null}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cat.programs.map((program) => (
                <ProgramCard key={program.id} program={program} onComingSoon={setComingSoonProgram} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Immersive band */}
      <section className="mb-14 rounded-2xl border border-sky-200 bg-sky-50/60 px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-3 text-2xl font-semibold text-black">{catalog.immersiveBand.title}</h2>
          <p className="mb-6 text-black/75">{catalog.immersiveBand.body}</p>
          <Button type="button" variant="outline" className="border-slate-300" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            {catalog.immersiveBand.ctaLabel}
          </Button>
        </div>
      </section>

      {/* Trainers */}
      <section className="mb-14">
        <h2 className="mb-2 text-center text-2xl font-semibold text-black">Coaches &amp; contributors</h2>
        <p className="mb-8 text-center text-sm text-black/65">
          Admins can edit names and links in <strong className="font-medium">Admin — courses</strong>.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {catalog.trainerLinks.map((t) =>
            t.href ? (
              <a
                key={t.name}
                href={t.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-slate-50"
              >
                {t.name}
              </a>
            ) : (
              <span
                key={t.name}
                className="rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5 text-sm text-black/70"
              >
                {t.name}
              </span>
            ),
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-14">
        <div className="mb-6 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-slate-700" aria-hidden />
          <h2 className="text-2xl font-semibold text-black">Frequently asked questions</h2>
        </div>
        <div className="space-y-2">
          {catalog.faq.map((item) => (
            <details
              key={item.question}
              className="group rounded-lg border border-slate-200 bg-white px-4 py-3 open:bg-slate-50/80"
            >
              <summary className="cursor-pointer list-none font-medium text-black marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  {item.question}
                  <span className="text-slate-400 transition group-open:rotate-180">▼</span>
                </span>
              </summary>
              <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-relaxed text-black/75">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-10 text-center text-white sm:px-10">
        <h2 className="mb-3 text-2xl font-semibold">{catalog.closingCta.title}</h2>
        <p className="mx-auto mb-6 max-w-xl text-slate-300">{catalog.closingCta.body}</p>
        <Button asChild className="bg-sky-500 text-white hover:bg-sky-600">
          <Link to={catalog.closingCta.ctaPath}>{catalog.closingCta.ctaLabel}</Link>
        </Button>
      </section>

      {/* Trailer modal */}
      {trailerOpen && trailerId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="courses-trailer-title"
        >
          <div className="relative w-full max-w-4xl rounded-xl bg-black p-2 shadow-xl">
            <button
              type="button"
              className="absolute -right-1 -top-10 rounded p-1 text-white hover:bg-white/10 sm:right-2 sm:top-2"
              aria-label="Close trailer"
              onClick={() => setTrailerOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
            <h2 id="courses-trailer-title" className="sr-only">
              Training trailer
            </h2>
            <div className="aspect-video w-full overflow-hidden rounded-lg">
              <iframe
                title="Course trailer"
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${trailerId}?autoplay=1&rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Coming soon modal */}
      {comingSoonProgram ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="courses-soon-title"
        >
          <Card className="relative w-full max-w-md border-slate-200 shadow-xl">
            <button
              type="button"
              className="absolute right-3 top-3 rounded p-1 text-black/50 hover:bg-black/5"
              aria-label="Close"
              onClick={() => setComingSoonProgram(null)}
            >
              <X className="h-5 w-5" />
            </button>
            <CardHeader>
              <CardTitle id="courses-soon-title" className="text-black pr-8">
                Coming soon
              </CardTitle>
              <CardDescription className="text-base text-black/80">
                <strong className="text-black">{comingSoonProgram}</strong> isn&apos;t linked yet. Check back later or ask
                your admin to add an external URL in the course catalog.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" className="w-full" onClick={() => setComingSoonProgram(null)}>
                OK
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
