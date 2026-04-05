import { Link } from "react-router";
import { hd2dLogoUrl } from "../../branding/hd2dLogoUrl";

type AuthScreenLayoutProps = {
  tagline: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Shared shell for login / sign-up: brand logo, subtle backdrop, safe areas.
 */
export function AuthScreenLayout({ tagline, children }: AuthScreenLayoutProps) {
  return (
    <div className="auth-page relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#030406] px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))] text-[#e7e9ea]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-18%,rgba(29,155,240,0.16),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_40%_at_100%_100%,rgba(29,155,240,0.06),transparent_55%)]"
        aria-hidden
      />
      <div className="relative z-[1] mb-8 flex w-full max-w-md flex-col items-center gap-4">
        <Link
          to="/"
          className="rounded-2xl p-2 ring-1 ring-white/10 transition hover:ring-[#1d9bf0]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1d9bf0]"
          aria-label="HD2D Closers home"
        >
          <img
            src={hd2dLogoUrl}
            alt="Hardcore D2D Closers"
            className="h-auto w-full max-h-[min(42vh,300px)] max-w-[min(16rem,88vw)] object-contain object-center select-none drop-shadow-[0_8px_32px_rgba(0,0,0,0.65)]"
            width={256}
            height={320}
            decoding="async"
            fetchPriority="high"
          />
        </Link>
        <p className="text-center text-sm leading-relaxed text-[#71767b] max-w-sm">{tagline}</p>
      </div>
      <div className="relative z-[1] w-full max-w-md">{children}</div>
    </div>
  );
}
