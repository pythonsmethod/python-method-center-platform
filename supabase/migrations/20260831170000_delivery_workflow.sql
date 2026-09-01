-- Carrier-neutral delivery workflow. Clients maintain a complete delivery
-- profile; volunteers receive only the data needed to send the parcel.
alter table public.profiles
  add column if not exists delivery_first_name text,
  add column if not exists delivery_last_name text,
  add column if not exists delivery_email text,
  add column if not exists delivery_phone text,
  add column if not exists delivery_country_code text,
  add column if not exists delivery_region text,
  add column if not exists delivery_city text,
  add column if not exists delivery_street text,
  add column if not exists delivery_building text,
  add column if not exists delivery_unit text,
  add column if not exists delivery_postal_code text,
  add column if not exists delivery_instructions text,
  add column if not exists delivery_confirmed_at timestamptz;

alter table public.profiles drop constraint if exists profiles_delivery_country_code_format;
alter table public.profiles add constraint profiles_delivery_country_code_format
  check (delivery_country_code is null or delivery_country_code ~ '^[A-Z]{2}$');

-- profiles.role is the existing actor_role enum in production.
alter type public.actor_role add value if not exists 'volunteer';

create table if not exists public.volunteer_assignments (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  country_name text not null check (char_length(country_name) between 2 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists volunteer_assignments_one_active_country
  on public.volunteer_assignments(country_code) where active;

do $$ begin
  create type public.delivery_task_status as enum ('preparing', 'shipped', 'problem');
exception when duplicate_object then null; end $$;

create table if not exists public.delivery_tasks (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references public.volunteer_assignments(profile_id),
  payment_id uuid unique references public.payments(id) on delete set null,
  client_profile_id uuid not null references public.profiles(id) on delete restrict,
  case_id uuid references public.client_cases(id) on delete set null,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  recipient_name text not null,
  recipient_email text not null,
  recipient_phone text not null,
  delivery_address text not null,
  delivery_instructions text,
  quantity integer not null default 1 check (quantity > 0),
  status public.delivery_task_status not null default 'preparing',
  shipment_document_path text,
  shipment_document_name text,
  volunteer_comment text,
  shipped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists delivery_tasks_volunteer_created
  on public.delivery_tasks(volunteer_id, created_at desc);
create index if not exists delivery_tasks_client_created
  on public.delivery_tasks(client_profile_id, created_at desc);

alter table public.volunteer_assignments enable row level security;
alter table public.delivery_tasks enable row level security;
revoke all on public.volunteer_assignments, public.delivery_tasks from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shipment-documents', 'shipment-documents', false, 10485760,
  array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.delivery_tasks is
  'Carrier-neutral delivery tasks. The volunteer uploads one shipment document and an optional client comment.';
