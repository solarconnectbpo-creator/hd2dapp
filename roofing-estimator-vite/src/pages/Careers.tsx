import { Link } from "react-router";
import { AuthScreenLayout } from "../components/auth/AuthScreenLayout";
import { AUTH_SIGNUP_CTA } from "../components/auth/authFieldStyles";
import { getExternalCareersUrl } from "../lib/careersLink";

export function Careers() {
  const external = getExternalCareersUrl();

  return (
    <AuthScreenLayout
      tagline={
        <>
          HD2D Closers works with roofing teams and field reps. If you&apos;re looking for a crew to run with, start here.
        </>
      }
    >
      <div className="rounded-2xl border border-[#2f3336] bg-[#16181c]/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <h1 className="mb-2 text-center text-xl font-bold text-[#e7e9ea]">Work with a roofing company</h1>
        <p className="mb-6 text-center text-sm leading-relaxed text-[#71767b]">
          Already have an app account for estimates and canvassing?{" "}
          <Link to="/login" className="font-medium text-[#1d9bf0] hover:underline">
            Sign in
          </Link>
          . This page is for people exploring employer / crew opportunities.
        </p>
        {external ? (
          <div className="flex flex-col gap-3">
            <a
              href={external}
              target="_blank"
              rel="noopener noreferrer"
              className="run-btn flex min-h-[48px] w-full items-center justify-center text-center"
            >
              Open careers &amp; applications
            </a>
            <p className="text-center text-xs text-[#71767b]">Opens in a new tab.</p>
          </div>
        ) : (
          <div className="space-y-4 text-sm leading-relaxed text-[#e7e9ea]">
            <p>
              Career postings and application links are configured by your organization. Ask your recruiter or admin for the
              current hiring link, or set <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs">VITE_CAREERS_URL</code>{" "}
              on the site deployment to point here.
            </p>
            <p className="text-[#71767b]">
              If you were invited to use the HD2D app as a rep, create an account instead.
            </p>
            <Link to="/signup" className={AUTH_SIGNUP_CTA}>
              Create app account
            </Link>
          </div>
        )}
        <p className="mt-6 text-center">
          <Link to="/login" className="text-sm font-medium text-[#71767b] underline-offset-2 hover:text-[#1d9bf0] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthScreenLayout>
  );
}
