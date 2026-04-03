# Backend Script Checks

- `npm run preflight:eagleview-embedded`
  - Verifies required embedded EagleView credential keys exist in `backend/.dev.vars` before deploy/dev startup.
- `npm run smoke:eagleview-token`
  - Calls both EagleView OAuth token endpoints (API Center + Embedded) and prints pass/fail diagnostics.
