create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  onboarded boolean default false,
  last_active_tab text,
  last_alert_read_at timestamptz,
  display_name text,
  email text,
  notifications_enabled boolean default true,
  favorite_vendor text,
  settings_last_opened_at timestamptz
);

create table if not exists public.user_tickets (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null references public.users(id) on delete cascade,
  stadium text,
  block text,
  gate text,
  row text,
  seat text,
  ticket_id text,
  date text,
  time text,
  timestamp timestamptz default now()
);

create table if not exists public.stadium_config (
  id text primary key,
  stadium text,
  date text,
  time text,
  status text,
  timer text
);

create table if not exists public.intel_alerts (
  id text primary key default gen_random_uuid()::text,
  type text,
  title text,
  description text,
  stadium text,
  created_at timestamptz default now()
);

create table if not exists public.queue_status (
  id text primary key,
  name text,
  waitMin integer,
  status text,
  type text,
  stadium text,
  updatedAt timestamptz default now()
);

create table if not exists public.facilities (
  id text primary key,
  name text,
  status text,
  category text,
  type text,
  dist text,
  color text,
  stadium text,
  updatedAt timestamptz default now()
);

create table if not exists public.menu_items (
  id text primary key default gen_random_uuid()::text,
  name text,
  price numeric,
  category text,
  calories integer,
  location text,
  wait_time text,
  is_active boolean default true,
  is_featured boolean default false,
  stadium text,
  image text
);

create table if not exists public.map_pois (
  id text primary key,
  type text,
  label text,
  "top" text,
  "left" text,
  x integer,
  y integer,
  stadium text,
  eta_min integer,
  distance_m integer,
  congestion_note text
);

create table if not exists public.crowd_levels (
  id text primary key,
  zone text,
  level text,
  updatedBy uuid,
  updatedAt timestamptz default now()
);

alter table public.users enable row level security;
alter table public.user_tickets enable row level security;
alter table public.stadium_config enable row level security;
alter table public.intel_alerts enable row level security;
alter table public.queue_status enable row level security;
alter table public.facilities enable row level security;
alter table public.menu_items enable row level security;
alter table public.map_pois enable row level security;
alter table public.crowd_levels enable row level security;

-- Very permissive policies for prototyping
create policy "allow_all_users" on public.users for all using (true) with check (true);
create policy "allow_all_tickets" on public.user_tickets for all using (true) with check (true);
create policy "allow_all_stadium_config" on public.stadium_config for all using (true) with check (true);
create policy "allow_all_intel_alerts" on public.intel_alerts for all using (true) with check (true);
create policy "allow_all_queue_status" on public.queue_status for all using (true) with check (true);
create policy "allow_all_facilities" on public.facilities for all using (true) with check (true);
create policy "allow_all_menu_items" on public.menu_items for all using (true) with check (true);
create policy "allow_all_map_pois" on public.map_pois for all using (true) with check (true);
create policy "allow_all_crowd_levels" on public.crowd_levels for all using (true) with check (true);
