create extension if not exists pgcrypto;

alter table if exists public.users
  add column if not exists onboarded boolean default false,
  add column if not exists last_active_tab text,
  add column if not exists last_alert_read_at timestamptz,
  add column if not exists display_name text,
  add column if not exists email text,
  add column if not exists notifications_enabled boolean default true,
  add column if not exists favorite_vendor text,
  add column if not exists settings_last_opened_at timestamptz;

alter table if exists public.user_tickets
  add column if not exists ticket_id text,
  add column if not exists date text,
  add column if not exists time text,
  add column if not exists timestamp timestamptz default now();

alter table if exists public.menu_items
  add column if not exists stadium text,
  add column if not exists is_featured boolean default false,
  add column if not exists wait_time text,
  add column if not exists location text,
  add column if not exists is_active boolean default true;

alter table if exists public.map_pois
  add column if not exists stadium text,
  add column if not exists eta_min integer,
  add column if not exists distance_m integer,
  add column if not exists congestion_note text;

alter table if exists public.queue_status
  add column if not exists stadium text;

alter table if exists public.facilities
  add column if not exists stadium text;

alter table if exists public.intel_alerts
  add column if not exists stadium text;

create table if not exists public.replay_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'published',
  stadium text,
  created_at timestamptz not null default now()
);

create table if not exists public.perk_catalog (
  id text primary key,
  title text not null,
  description text,
  cta_label text,
  category text not null default 'general',
  status text not null default 'active',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_perk_actions (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null references auth.users(id) on delete cascade,
  perk_id text not null references public.perk_catalog(id) on delete cascade,
  action text not null,
  status text not null default 'completed',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_action_requests (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null references auth.users(id) on delete cascade,
  ticket_id text,
  action_type text not null,
  status text not null default 'pending',
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null references auth.users(id) on delete cascade,
  category text not null,
  ticket_id text,
  message text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.squads (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  stadium text,
  created_at timestamptz not null default now()
);

create table if not exists public.squad_members (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references public.squads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  current_location text,
  status text not null default 'active',
  color text,
  joined_at timestamptz not null default now(),
  unique (squad_id, user_id)
);

create table if not exists public.stadium_layouts (
  stadium text primary key,
  north_label text,
  south_label text,
  east_label text,
  west_label text,
  updated_at timestamptz not null default now()
);

create table if not exists public.transport_options (
  id uuid primary key default gen_random_uuid(),
  mode text not null,
  title text not null,
  subtitle text not null,
  eta_min integer not null default 0,
  stadium text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null references auth.users(id) on delete cascade,
  vendor_name text not null,
  created_at timestamptz not null default now(),
  unique (uid, vendor_name)
);

create table if not exists public.user_settings (
  uid uuid primary key references auth.users(id) on delete cascade,
  notifications_enabled boolean not null default true,
  theme text not null default 'stadium',
  updated_at timestamptz not null default now()
);

alter table public.replay_items enable row level security;
alter table public.perk_catalog enable row level security;
alter table public.user_perk_actions enable row level security;
alter table public.ticket_action_requests enable row level security;
alter table public.support_requests enable row level security;
alter table public.squads enable row level security;
alter table public.squad_members enable row level security;
alter table public.stadium_layouts enable row level security;
alter table public.transport_options enable row level security;
alter table public.user_favorites enable row level security;
alter table public.user_settings enable row level security;

create policy "replay_items_read" on public.replay_items
  for select to anon, authenticated using (true);
create policy "perk_catalog_read" on public.perk_catalog
  for select to anon, authenticated using (true);
create policy "stadium_layouts_read" on public.stadium_layouts
  for select to anon, authenticated using (true);
create policy "transport_options_read" on public.transport_options
  for select to anon, authenticated using (true);

create policy "user_perk_actions_own" on public.user_perk_actions
  for all to authenticated using (auth.uid() = uid) with check (auth.uid() = uid);
create policy "ticket_action_requests_own" on public.ticket_action_requests
  for all to authenticated using (auth.uid() = uid) with check (auth.uid() = uid);
create policy "support_requests_own" on public.support_requests
  for all to authenticated using (auth.uid() = uid) with check (auth.uid() = uid);
create policy "squads_read_authenticated" on public.squads
  for select to authenticated using (true);
create policy "squads_create_authenticated" on public.squads
  for insert to authenticated with check (auth.uid() = created_by);
create policy "squad_members_own" on public.squad_members
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "squad_members_read_authenticated" on public.squad_members
  for select to authenticated using (true);
create policy "user_favorites_own" on public.user_favorites
  for all to authenticated using (auth.uid() = uid) with check (auth.uid() = uid);
create policy "user_settings_own" on public.user_settings
  for all to authenticated using (auth.uid() = uid) with check (auth.uid() = uid);
