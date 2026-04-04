/** Shared Tailwind classes for auth text/password inputs (matches existing auth-input look). */
export const AUTH_FIELD_CLASS =
  "auth-input w-full rounded-lg border border-[#2f3336] bg-[#000000] px-3 py-2.5 text-[#e7e9ea] outline-none transition focus:border-[#1d9bf0] focus:ring-2 focus:ring-[#1d9bf0]/25";

/** Secondary full-width nav button (e.g. “Sign in instead” on sign-up). */
export const AUTH_SECONDARY_BTN =
  "flex min-h-[48px] w-full items-center justify-center rounded-full border border-[#2f3336] bg-[#0b0e11] px-4 text-center text-sm font-semibold text-[#e7e9ea] shadow-sm ring-1 ring-white/[0.04] transition hover:border-[#3f4448] hover:bg-[#16181c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d9bf0]";

/** Accent CTA for sign-up on login (matches `run-btn` — works on Vercel + Pages). */
export const AUTH_SIGNUP_CTA =
  "run-btn flex min-h-[48px] w-full items-center justify-center rounded-full px-4 text-center text-sm font-bold text-white shadow-[0_8px_24px_rgba(29,155,240,0.25)] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d9bf0]";
