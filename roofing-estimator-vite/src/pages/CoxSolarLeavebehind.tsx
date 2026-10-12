import { Link } from "react-router";
import { Seo } from "../components/Seo";
import { coxRoofingLogoUrl } from "../branding/coxRoofingLogoUrl";
import {
  COX_SOLAR_BRAND,
  COX_SOLAR_DISCLAIMER,
  COX_SOLAR_LEAVEBEHIND_BULLETS,
  COX_SOLAR_LEAVEBEHIND_PATH,
  COX_SOLAR_PUBLIC_PATH,
} from "../lib/cox/solarMarketing/coxSolarMarketingContent";
import { coxSolarNemDiagramSvg } from "../lib/cox/solarMarketing/buildCoxSolarMarketingHtml";

/**
 * Public one-page door leave-behind. Served at `/cox-solar/leavebehind` without auth.
 */
export function CoxSolarLeavebehind() {
  return (
    <div className="min-h-[100dvh] bg-white text-[#122033]">
      <Seo
        title="Cox Solar Solutions — Illinois leave-behind"
        description={COX_SOLAR_BRAND.pitch}
        path={COX_SOLAR_LEAVEBEHIND_PATH}
      />

      <article className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6 flex items-center justify-between gap-4 border-b-[6px] border-[#c8102e] pb-3">
          <img
            src={coxRoofingLogoUrl}
            alt="Cox Roofing"
            className="h-16 w-auto object-contain sm:h-20"
            width={280}
            height={100}
          />
          <div className="text-right text-[11px] leading-relaxed text-[#0f2744]">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#c8102e]">
              {COX_SOLAR_BRAND.productName}
            </p>
            <p>
              <a href={COX_SOLAR_BRAND.phoneHref} className="font-semibold underline-offset-2 hover:underline">
                {COX_SOLAR_BRAND.phoneDisplay}
              </a>
            </p>
            <p>
              <a
                href={COX_SOLAR_BRAND.websiteHref}
                className="underline-offset-2 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {COX_SOLAR_BRAND.websiteDisplay}
              </a>
            </p>
          </div>
        </header>

        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#c8102e]">{COX_SOLAR_BRAND.motto}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0f2744] sm:text-4xl">
            {COX_SOLAR_BRAND.productName}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg font-semibold leading-relaxed text-[#0f2744] sm:text-xl">
            {COX_SOLAR_BRAND.pitch}
          </p>
        </div>

        <div
          className="mx-auto my-6 max-w-xl"
          dangerouslySetInnerHTML={{ __html: coxSolarNemDiagramSvg() }}
        />

        <ul className="mx-auto max-w-xl list-disc space-y-2 pl-5 text-left text-[15px] leading-relaxed text-[#122033]">
          {COX_SOLAR_LEAVEBEHIND_BULLETS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <div className="mx-auto my-6 max-w-xl rounded-lg bg-[#0f2744] px-4 py-4 text-center text-white">
          <p className="text-lg font-semibold">Call {COX_SOLAR_BRAND.phoneDisplay}</p>
          <p className="mt-1 text-sm text-white/85">
            {COX_SOLAR_BRAND.addressLine1}, {COX_SOLAR_BRAND.cityStateZip} · {COX_SOLAR_BRAND.websiteDisplay}
          </p>
        </div>

        <p className="mx-auto max-w-xl text-center text-xs leading-relaxed text-[#5b6b7c]">{COX_SOLAR_DISCLAIMER}</p>
        <p className="mt-4 text-center text-sm">
          <Link to={COX_SOLAR_PUBLIC_PATH} className="font-semibold text-[#0f2744] underline-offset-2 hover:underline">
            Open the full Illinois guide
          </Link>
        </p>
      </article>
    </div>
  );
}
