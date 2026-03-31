# App Store & Play Store deployment (Expo + EAS)

This project is **Expo SDK 54** (`app.json` / `app.config.js`). The native app is **not** the `roofing-estimator-vite` folder (that is a separate web-only tool).

## 1. Supabase (backend for leads sync)

The app syncs roof/map leads to Supabase when configured (`src/lib/supabaseClient.ts`, `src/roofReports/roofLeadsSupabase.ts`).

### Create project & table

1. Create a project at [supabase.com](https://supabase.com).
2. **Settings → API**: copy **Project URL** and **anon public** key (long JWT — not `sbp_` CLI tokens).
3. In **SQL Editor**, run the migration in `supabase/migrations/20250322120000_roof_leads.sql` (creates `roof_leads` + RLS policies for anon).

### App environment

Copy `.env.example` → `.env` / `.env.local` and set:

```text
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
EXPO_PUBLIC_SUPABASE_LEADS_TABLE=roof_leads
```

These are embedded at **build time** (`EXPO_PUBLIC_*`). `app.config.js` also mirrors them into `extra` so EAS builds can resolve them when env is injected in the cloud.

### Production RLS

The sample migration allows **anon read/write on all rows** (good for demos). Before production, tighten policies (e.g. `auth.uid()` per org, or Edge Functions only).

---

## 2. EAS (Expo Application Services)

### One-time setup

```bash
npm i -g eas-cli
eas login
eas build:configure
```

Link the project: `eas project:init` (creates `projectId` in `app.json` if missing — you may need to add an `expo.extra.eas.projectId` after first init; follow CLI prompts).

### Secrets for cloud builds

In the [EAS dashboard](https://expo.dev) or CLI, set:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SUPABASE_LEADS_TABLE` (optional)
- `EXPO_PUBLIC_MAPBOX_TOKEN` and other `EXPO_PUBLIC_*` keys your app needs

Or use **EAS Environment Variables** (production) so the build pipeline injects them into `process.env` at bundle time.

### Build commands

```bash
# iOS (device / TestFlight / App Store)
eas build --platform ios --profile production

# Android (Play internal / production track)
eas build --platform android --profile production
```

Profiles are defined in `eas.json` (`development`, `preview`, `production`). `android.versionCode` / `ios.buildNumber` in `app.json` seed store versioning; `autoIncrement` on production helps Play/App Store updates.

### Submit to stores

**iOS (App Store Connect)**

1. Apple Developer Program, App Store Connect app record matching `bundleIdentifier` (`com.hardcoredoortodoorclosers.app`).
2. `eas submit --platform ios` (after a production build) or upload via Transporter.

**Android (Google Play)**

1. Play Console app with package `com.hardcoredoortodoorclosers.app`.
2. **Signing**: EAS manages Android credentials by default.
3. `eas submit --platform android` (or upload AAB manually).

Fill in `eas.json` → `submit.production` with Apple / Google credentials when ready (see [EAS Submit](https://docs.expo.dev/submit/introduction/)).

---

## 3. Store compliance checklist

- **Privacy policy URL** — required in both stores; host and link in store listings.
- **Location** — `NSLocationWhenInUseUsageDescription` (iOS) and Android location permissions are declared in `app.json`; explain in the privacy questionnaire.
- **Data collection** — disclose Supabase sync (property leads JSON), Mapbox, and any analytics you enable.
- **Encryption export** — US App Store: typically “uses standard HTTPS only” (no custom encryption).

---

## 4. Optional: Expo Updates (OTA)

Not required for store submission. Add `expo-updates` and configure `runtimeVersion` if you want EAS Update later.
