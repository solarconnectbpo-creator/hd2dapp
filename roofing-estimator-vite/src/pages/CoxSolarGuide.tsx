import { Link } from "react-router";
import { Printer, Sun } from "lucide-react";
import { toast } from "sonner";
import { Seo } from "../components/Seo";
import { coxRoofingLogoUrl } from "../branding/coxRoofingLogoUrl";
import {
  COX_SOLAR_BRAND,
  COX_SOLAR_DISCLAIMER,
  COX_SOLAR_FAQ,
  COX_SOLAR_HOW_IT_WORKS,
  COX_SOLAR_INCENTIVES,
  COX_SOLAR_KIT_PATH,
  COX_SOLAR_LEAVEBEHIND_PATH,
  COX_SOLAR_PROCESS,
  COX_SOLAR_PUBLIC_PATH,
  COX_SOLAR_WHY,
} from "../lib/cox/solarMarketing/coxSolarMarketingContent";
import {
  coxSolarNemDiagramSvg,
  openCoxSolarMarketingPrint,
} from "../lib/cox/solarMarketing/buildCoxSolarMarketingHtml";

function printGuide() {
  if (!openCoxSolarMarketingPrint("guide")) {
    toast.error("Pop-up blocked — allow pop-ups to print the solar guide.");
  }
}

/**
 * Public Cox Roofing Solar homeowner guide (Illinois incentives + roof-first pitch).
 */
export function CoxSolarGuide() {
  return (
    <div className="min-h-[100dvh] bg-[#f4f6f9] text-[#122033]">
      <Seo
        title="Cox Solar Solutions — Illinois homeowner guide"
        description="You provide the roof and only pay for the power. Cox Solar Solutions explains Illinois net metering, ComEd rebates, Solar for All, and Chicago permit programs."
        path={COX_SOLAR_PUBLIC_PATH}
      />

      <header className="border-b-4 border-[#c8102e] bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <img
            src={coxRoofingLogoUrl}
            alt="Cox Roofing"
            className="h-16 w-auto object-contain sm:h-20"
            width={280}
            height={80}
          />
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <a
              href={COX_SOLAR_BRAND.phoneHref}
              className="font-semibold text-[#0f2744] underline-offset-4 hover:underline"
            >
              {COX_SOLAR_BRAND.phoneDisplay}
            </a>
            <button
              type="button"
              onClick={printGuide}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0f2744] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16345c]"
            >
              <Printer className="h-4 w-4" aria-hidden />
              Print / save PDF
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="bg-[#0f2744] text-white">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:py-16">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#f0b7bf]">
                {COX_SOLAR_BRAND.motto}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">{COX_SOLAR_BRAND.productName}</h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-[#d7e2ef]">{COX_SOLAR_BRAND.pitch}</p>
              <p className="mt-3 max-w-xl text-sm text-[#9eb0c4]">{COX_SOLAR_BRAND.tagline}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={COX_SOLAR_BRAND.phoneHref}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#c8102e] px-6 text-sm font-semibold text-white hover:bg-[#a50d26]"
                >
                  Call {COX_SOLAR_BRAND.phoneDisplay}
                </a>
                <a
                  href="#incentives"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 px-6 text-sm font-semibold text-white hover:bg-white/10"
                >
                  See Illinois programs
                </a>
                <Link
                  to={COX_SOLAR_LEAVEBEHIND_PATH}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 px-6 text-sm font-semibold text-white hover:bg-white/10"
                >
                  One-page leave-behind
                </Link>
              </div>
            </div>
            <div
              className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10"
              dangerouslySetInnerHTML={{ __html: coxSolarNemDiagramSvg({ dark: true }) }}
            />
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6" id="what-we-do">
          <h2 className="text-2xl font-semibold text-[#0f2744]">What we do</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-[#3d4d5f]">
            You keep the roof. We take the rest: inspection or replacement, system design, permits, installation,
            interconnection, and monitoring. The bill should show power you produced — not a stack of vendor invoices.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {COX_SOLAR_WHY.map((item) => (
              <article key={item.title} className="rounded-2xl border border-[#d5dde6] bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-[#0f2744]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#3d4d5f]">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
            <div className="mb-6 flex items-center gap-2 text-[#c8102e]">
              <Sun className="h-5 w-5" aria-hidden />
              <h2 className="text-2xl font-semibold text-[#0f2744]">How solar works</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {COX_SOLAR_HOW_IT_WORKS.map((item) => (
                <article key={item.title} className="rounded-2xl bg-[#f4f6f9] p-5">
                  <h3 className="font-semibold text-[#0f2744]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#3d4d5f]">{item.body}</p>
                </article>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-[#d5dde6] bg-[#f7f9fc] p-5">
              <h3 className="font-semibold text-[#0f2744]">Net energy metering</h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#3d4d5f]">
                Surplus power the home does not use is sent back to the utility. Illinois still credits that export.
                Systems installed before January 1, 2025 generally keep full retail-rate credits. New customers receive
                supply-only credits under Smart Solar Billing. We model the tariff that matches this interconnect date.
              </p>
              <div
                className="mt-4 max-w-xl"
                dangerouslySetInnerHTML={{ __html: coxSolarNemDiagramSvg() }}
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6" id="incentives">
          <h2 className="text-2xl font-semibold text-[#0f2744]">Illinois &amp; Chicago programs</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#3d4d5f]">
            These are the programs we walk on the porch. Amounts and eligibility change — the printed proposal lists
            what this address can actually claim.
          </p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-[#d5dde6] bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0f2744] text-xs uppercase tracking-wider text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">Program</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="hidden px-4 py-3 font-semibold sm:table-cell">What it can mean</th>
                </tr>
              </thead>
              <tbody>
                {COX_SOLAR_INCENTIVES.map((row, idx) => (
                  <tr key={row.id} className={idx % 2 === 0 ? "bg-white" : "bg-[#f4f6f9]"}>
                    <td className="px-4 py-4 align-top font-semibold text-[#0f2744]">
                      {row.name}
                      <p className="mt-1 text-xs font-normal text-[#5b6b7c] sm:hidden">{row.summary}</p>
                    </td>
                    <td className="px-4 py-4 align-top text-[#c8102e]">{row.kindLabel}</td>
                    <td className="hidden px-4 py-4 align-top text-[#3d4d5f] sm:table-cell">{row.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
            <h2 className="text-2xl font-semibold text-[#0f2744]">How a Cox install moves</h2>
            <ol className="mt-6 grid gap-4 sm:grid-cols-2">
              {COX_SOLAR_PROCESS.map((step) => (
                <li key={step.title} className="rounded-2xl border border-[#d5dde6] p-5">
                  <h3 className="font-semibold text-[#0f2744]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#3d4d5f]">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-semibold text-[#0f2744]">Questions we hear on the porch</h2>
          <div className="mt-6 space-y-3">
            {COX_SOLAR_FAQ.map((item) => (
              <details key={item.question} className="rounded-2xl border border-[#d5dde6] bg-white px-5 py-4">
                <summary className="cursor-pointer font-semibold text-[#0f2744]">{item.question}</summary>
                <p className="mt-2 text-sm leading-relaxed text-[#3d4d5f]">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="bg-[#0f2744] text-white">
          <div className="mx-auto max-w-5xl px-4 py-12 text-center sm:px-6">
            <h2 className="text-2xl font-semibold">Ready for a roof-first solar review?</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-[#9eb0c4]">
              {COX_SOLAR_BRAND.addressLine1}, {COX_SOLAR_BRAND.cityStateZip}
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={COX_SOLAR_BRAND.phoneHref}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#c8102e] px-6 text-sm font-semibold text-white hover:bg-[#a50d26]"
              >
                {COX_SOLAR_BRAND.phoneDisplay}
              </a>
              <a
                href={`mailto:${COX_SOLAR_BRAND.email}`}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 px-6 text-sm font-semibold hover:bg-white/10"
              >
                {COX_SOLAR_BRAND.email}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#d5dde6] bg-white px-4 py-8 text-center text-xs leading-relaxed text-[#5b6b7c] sm:px-6">
        <p className="mx-auto max-w-3xl">{COX_SOLAR_DISCLAIMER}</p>
        <p className="mt-4">
          Field reps:{" "}
          <Link
            to={COX_SOLAR_LEAVEBEHIND_PATH}
            className="font-semibold text-[#0f2744] underline-offset-2 hover:underline"
          >
            door leave-behind
          </Link>
          {" · "}
          <Link to={COX_SOLAR_KIT_PATH} className="font-semibold text-[#0f2744] underline-offset-2 hover:underline">
            open the closer kit
          </Link>
          {" · "}
          <Link to="/login" className="underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </footer>
    </div>
  );
}
