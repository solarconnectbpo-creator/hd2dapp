import { Link } from "react-router";
import { AuthScreenLayout } from "../components/auth/AuthScreenLayout";
import { AUTH_SIGNUP_CTA } from "../components/auth/authFieldStyles";
import { Seo } from "../components/Seo";
import { getExternalCareersUrl } from "../lib/careersLink";

export function Careers() {
  const external = getExternalCareersUrl();

  return (
    <AuthScreenLayout
      tagline={
        <>
          Door to Door Closers connects field reps with roofing teams - local territories and storm-response crews. Start a rep
          profile to be matched with orgs in your state.
        </>
      }
    >
      <Seo
        title="Careers & field reps - Door to Door Closers"
        description="Join Door to Door Closers as a field sales rep or roofing company. Reps sign up with home state and placement preference; contractors create an organization workspace."
        path="/careers"
      />
      <div className="rounded-2xl border border-white/[0.08] bg-[#12141a]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.04] backdrop-blur-md">
        <h1 className="mb-2 text-center text-xl font-bold text-[#e7e9ea]">Work with a roofing company</h1>
        <p className="mb-6 text-center text-sm leading-relaxed text-[#71767b]">
          Field reps: create an account, add your home state, and choose local vs storm placement - we route you toward
          partner teams (directory + admin placement). Companies: sign up as a{" "}
          <strong className="text-[#e7e9ea]">roofing company</strong> to own your org workspace.
        </p>
        <div className="flex flex-col gap-3">
          <Link to="/signup?type=rep" className={AUTH_SIGNUP_CTA}>
            Sign up as a field rep
          </Link>
          <Link
            to="/signup?type=company"
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.04] text-center text-sm font-semibold text-[#e7e9ea] hover:bg-white/[0.08]"
          >
            Register a roofing company
          </Link>
          {external ? (
            <>
              <a
                href={external}
                target="_blank"
                rel="noopener noreferrer"
                className="run-btn flex min-h-[48px] w-full items-center justify-center text-center"
              >
                External careers &amp; postings
              </a>
              <p className="text-center text-xs text-[#71767b]">Opens in a new tab.</p>
            </>
          ) : (
            <p className="text-center text-xs text-[#71767b]">
              Optional: set <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs">VITE_CAREERS_URL</code> to link
              an external ATS or job board.
            </p>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-[#71767b]">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-[#1d9bf0] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthScreenLayout>
  );
}
