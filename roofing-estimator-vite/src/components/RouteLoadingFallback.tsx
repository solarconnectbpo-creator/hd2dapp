/** Shown while lazy route chunks load. */
export function RouteLoadingFallback() {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-[#71767b]"
      role="status"
      aria-live="polite"
    >
      <span
        className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#2f3336] border-t-[#1d9bf0]"
        aria-hidden
      />
      <p className="text-sm">Loading…</p>
    </div>
  );
}
