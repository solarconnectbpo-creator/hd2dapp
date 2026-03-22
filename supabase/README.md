# Supabase (HD2D)

## Create the `roof_leads` table

1. Open [Supabase](https://supabase.com) → your project → **SQL Editor**.
2. **New query**, paste the contents of `migrations/20250322120000_roof_leads.sql`, then **Run**.

Alternatively, with the [Supabase CLI](https://supabase.com/docs/guides/cli) linked to this project:

```bash
supabase db push
```

## App configuration

In `.env.local` (not committed), set:

- `EXPO_PUBLIC_SUPABASE_URL` — **Project URL** (Settings → API)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — **anon public** key (Settings → API)

Optional: `EXPO_PUBLIC_SUPABASE_LEADS_TABLE` — defaults to `roof_leads`.

After saving leads from the map or CSV, the app **upserts** rows to this table and **merges** on load. RLS policies in the migration are permissive for prototyping; tighten them before production.
