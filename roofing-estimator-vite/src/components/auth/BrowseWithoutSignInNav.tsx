import { Link } from "react-router";

/** Shown on login/sign-up so visitors can open courses, call center, leads, and marketing without an account. */
export function BrowseWithoutSignInNav() {
  return (
    <nav
      className="mb-6 rounded-xl border border-white/[0.08] bg-[#0c0e12]/80 px-3 py-3 text-center"
      aria-label="Browse without signing in"
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8b9199]">Explore</p>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
        <Link to="/courses" className="font-medium text-[#1d9bf0] hover:underline">
          Courses
        </Link>
        <span className="text-[#3d4146]" aria-hidden>
          ·
        </span>
        <Link to="/call-center" className="font-medium text-[#1d9bf0] hover:underline">
          Call center
        </Link>
        <span className="text-[#3d4146]" aria-hidden>
          ·
        </span>
        <Link to="/leads" className="font-medium text-[#1d9bf0] hover:underline">
          Buy leads
        </Link>
        <span className="text-[#3d4146]" aria-hidden>
          ·
        </span>
        <Link to="/marketing" className="font-medium text-[#1d9bf0] hover:underline">
          Marketing
        </Link>
      </div>
    </nav>
  );
}
