# Performance baseline — HD2D SPA (hardcoredoortodoorclosers.com)

Last reviewed: 2026-04-04 (code + static analysis; re-run Lighthouse after each major release).

## How to measure (manual — authoritative)

1. Open Chrome → DevTools → **Lighthouse** (or **Performance** panel).
2. URLs to test:
   - **Public:** `https://hardcoredoortodoorclosers.com/login` (typical LCP: logo + fonts).
   - **Authed:** Dashboard and `/measurement/new` after sign-in (map chunks affect LCP/TBT).
3. Mode: **Navigation**, device: **Mobile** first, then Desktop.
4. Record **LCP**, **CLS**, **TBT** (or **INP** in newer Chrome), and the top 3 **Opportunities** / **Diagnostics**.

## Repo assumptions (no Lighthouse run in CI)

- **Code splitting:** Heavy routes use `lazyRoute` in [`src/routes.tsx`](../src/routes.tsx). MapLibre is isolated in a dedicated Rollup chunk ([`vite.config.ts`](../vite.config.ts) `manualChunks`).
- **Fonts:** Inter is loaded from Google Fonts with `display=swap` and Latin subset in [`index.html`](../index.html).
- **Images:** Brand lockup is bundled with explicit dimensions on auth/shell; sidebar logo uses `loading="lazy"` where below-the-fold on desktop.

## Implemented quick wins (track here)

| Change | Rationale |
|--------|-----------|
| `manualChunks` maplibre / react | Avoid one giant entry; map code not on every route |
| Font subset + swap | Smaller CSS/font path, reduce invisible text duration |
| Logo `fetchPriority` / `loading` | Improve LCP on mobile header vs defer sidebar asset |

## Follow-ups when Lighthouse flags regressions

- Run `npm run build` and inspect `dist/assets` sizes; consider dynamic import for rarely used pages.
- If LCP is a map route: ensure map container has fixed height (already in `index.css` measurement shell).
- Consider **Vercel Speed Insights** or **web-vitals** RUM if you want production field data (optional product work).
