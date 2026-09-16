-- Bearings AI: public family updates
-- Run this in Supabase SQL Editor once a project is created.
-- Do NOT expose service-role credentials to the browser.

create table if not exists public.daily_updates (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  subject text not null check (char_length(subject) between 1 and 100),
  content text not null check (char_length(content) between 1 and 4000),
  homework text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_updates_date_desc_idx on public.daily_updates (date desc);

alter table public.daily_updates enable row level security;

-- Families can read only the published, non-sensitive updates.
create policy "Family visitors can read daily updates"
  on public.daily_updates for select
  to anon, authenticated
  using (true);

-- No browser-side INSERT policy is intentional. Publish updates from an
-- authenticated teacher dashboard or a serverless function using Supabase Auth.

-- Optional: automatically maintain updated_at.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists daily_updates_set_updated_at on public.daily_updates;
create trigger daily_updates_set_updated_at
  before update on public.daily_updates
  for each row execute procedure public.set_updated_at();
