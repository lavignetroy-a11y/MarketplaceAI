-- Marketplace / AI -- initial schema.
--
-- Run this in your Supabase project: SQL Editor -> New query -> paste -> Run.
-- (Or `supabase db push` if you use the CLI.)
--
-- Creates the tables behind accounts and campaign history, with row-level security so a
-- signed-in user can only ever reach their own rows.

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created automatically on sign-up
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "own profile readable" on public.profiles;
create policy "own profile readable" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "own profile updatable" on public.profiles;
create policy "own profile updatable" on public.profiles
  for update using (auth.uid() = id);

-- Mirror new auth users into profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- campaigns: one row per uploaded set of photos of a single item
-- ---------------------------------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  status text not null default 'queued',
  status_message text,
  requested_count integer not null,
  seller_notes text,
  -- product identity + campaign plan from the analysis stage
  analysis jsonb,
  listing_title text,
  listing_description text,
  -- payment: preview images are free, the full set unlocks once this flips
  paid boolean not null default false,
  price_cents integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaigns_user_id_created_at_idx
  on public.campaigns (user_id, created_at desc);

alter table public.campaigns enable row level security;

-- Anonymous (signed-out) campaigns have user_id null and are reachable only by their id,
-- which the browser holds; signed-in users see everything they own.
drop policy if exists "own campaigns readable" on public.campaigns;
create policy "own campaigns readable" on public.campaigns
  for select using (auth.uid() = user_id);

drop policy if exists "own campaigns insertable" on public.campaigns;
create policy "own campaigns insertable" on public.campaigns
  for insert with check (auth.uid() = user_id or user_id is null);

drop policy if exists "own campaigns updatable" on public.campaigns;
create policy "own campaigns updatable" on public.campaigns
  for update using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- campaign_images: the generated set, in listing order
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_images (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  sequence_number integer not null,
  image_role text,
  image_job text,
  status text not null default 'pending',
  -- storage path in the `campaign-images` bucket; null while pending or failed
  storage_path text,
  -- a free preview is watermarked until the campaign is paid for
  is_preview boolean not null default false,
  watermarked boolean not null default false,
  error text,
  created_at timestamptz not null default now(),
  unique (campaign_id, sequence_number)
);

create index if not exists campaign_images_campaign_id_idx
  on public.campaign_images (campaign_id, sequence_number);

alter table public.campaign_images enable row level security;

drop policy if exists "own campaign images readable" on public.campaign_images;
create policy "own campaign images readable" on public.campaign_images
  for select using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_images.campaign_id and c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- storage bucket for generated images (private; served via signed URLs)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('campaign-images', 'campaign-images', false)
on conflict (id) do nothing;

drop policy if exists "own campaign images downloadable" on storage.objects;
create policy "own campaign images downloadable" on storage.objects
  for select using (
    bucket_id = 'campaign-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
