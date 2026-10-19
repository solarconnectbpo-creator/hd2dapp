import { Link } from "react-router";
import { Seo } from "../components/Seo";
import { coxSolarSolutionsLogoUrl } from "../branding/coxSolarSolutionsLogoUrl";
import {
  COX_SOLAR_BRAND,
  COX_SOLAR_LEAVEBEHIND_PATH,
  COX_SOLAR_PUBLIC_PATH,
  COX_SOLAR_SLICKS_PATH,
  COX_SOLAR_SLICKS_PDF_PATH,
} from "../lib/cox/solarMarketing/coxSolarMarketingContent";

/**
 * Public viewer for the official 11-page visual marketing slick
 * with the Cox Solar Solutions lockup stamped on every page.
 */
export function CoxSolarSlicks() {
  return (
    <div className="min-h-[100dvh] bg-[#0f1722] text-white">
      <Seo
        title="Cox Solar Solutions — visual marketing slicks"
        description="Official Cox visual marketing slick with the Cox Solar Solutions logo."
        path={COX_SOLAR_SLICKS_PATH}
      />

      <header className="border-b border-white/10 bg-[#0b1220]">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <img
            src={coxSolarSolutionsLogoUrl}
            alt="Cox Solar Solutions"
            className="h-14 w-auto object-contain sm:h-16"
            width={280}
            height={80}
          />
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <a
              href={COX_SOLAR_SLICKS_PDF_PATH}
              download
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#c8102e] px-4 font-semibold text-white hover:bg-[#a50d26]"
            >
              Download PDF
            </a>
            <a
              href={COX_SOLAR_BRAND.phoneHref}
              className="font-semibold text-white/90 underline-offset-4 hover:underline"
            >
              {COX_SOLAR_BRAND.phoneDisplay}
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f0b7bf]">{COX_SOLAR_BRAND.motto}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Visual marketing slicks</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
          Official 11-page booklet with the Cox Solar Solutions logo on every page. Open the PDF below or download it
          to print.
        </p>

        <div className="mt-6 overflow-hidden rounded-xl bg-[#111b2b] ring-1 ring-white/10">
          <object
            data={COX_SOLAR_SLICKS_PDF_PATH}
            type="application/pdf"
            className="h-[min(88vh,1100px)] w-full"
            aria-label="Cox Solar Solutions visual marketing slicks PDF"
          >
            <p className="p-6 text-sm text-white/80">
              This browser cannot preview the PDF.{" "}
              <a href={COX_SOLAR_SLICKS_PDF_PATH} className="font-semibold underline">
                Download the visual marketing slicks
              </a>
              .
            </p>
          </object>
        </div>

        <p className="mt-6 text-sm text-white/65">
          <Link to={COX_SOLAR_LEAVEBEHIND_PATH} className="font-semibold text-white underline-offset-2 hover:underline">
            One-page leave-behind
          </Link>
          {" · "}
          <Link to={COX_SOLAR_PUBLIC_PATH} className="font-semibold text-white underline-offset-2 hover:underline">
            Illinois guide
          </Link>
        </p>
      </main>
    </div>
  );
}
