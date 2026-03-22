-- HD2D: CSV / map property leads (matches PropertySelection JSON in the app).
-- Run in Supabase: SQL Editor → New query → paste → Run.
-- Or: supabase db push (if using Supabase CLI linked to this project).

create table if not exists public.roof_leads (
  id uuid primary key default gen_random_uuid(),
  -- Stable key from app: lead.id or hash of lat|lng|address
  client_lead_id text not null unique,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.roof_leads is 'Property leads from CSV / map picker; payload mirrors PropertySelection.';

create index if not exists roof_leads_payload_gin on public.roof_leads using gin (payload);

create or replace function public.roof_leads_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists roof_leads_set_updated_at on public.roof_leads;
create trigger roof_leads_set_updated_at
  before update on public.roof_leads
  for each row
  execute procedure public.roof_leads_set_updated_at();

alter table public.roof_leads enable row level security;

-- Prototype: anon + authenticated can read/write all rows.
-- Tighten before production (e.g. auth.uid() per tenant, or Edge Functions + service role).
create policy "roof_leads_select_all"
  on public.roof_leads for select
  to anon, authenticated
  using (true);

create policy "roof_leads_insert_all"
  on public.roof_leads for insert
  to anon, authenticated
  with check (true);

create policy "roof_leads_update_all"
  on public.roof_leads for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "roof_leads_delete_all"
  on public.roof_leads for delete
  to anon, authenticated
  using (true);
