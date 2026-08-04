-- The shop's waiting list.
--
-- The shop shows a line that is being prepared: formulas, care products,
-- the book, the signs of the centre. Nothing there can be bought yet, and
-- until it can, the only thing worth doing with a visitor's interest is
-- writing it down. Without this table the interest is simply lost.
--
-- Deliberately not support_requests: a waiting-list entry is not a
-- question and needs no answer, and dropping months of them into the
-- queue the team watches would bury the requests that do.
--
-- Written only by the service role — the person leaving an email is
-- usually anonymous — so RLS is enabled with no policy at all: the anon
-- and authenticated roles cannot read or write it, and the team reads it
-- through the service key.

create table if not exists public.shop_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  -- Which product the person came for. Null means the line as a whole.
  item_id text,
  -- Present when they were signed in; the list is open to visitors too.
  profile_id uuid references public.profiles(id) on delete set null,
  -- The language they were reading in — it decides which language the
  -- launch announcement is written in.
  locale text not null default 'ru',
  created_at timestamptz not null default now()
);

comment on table public.shop_waitlist is
  'People who asked to be told when a shop product becomes available. Marketing consent is given by a separate tick on the form; the row is the record that it was.';

-- One person, one product, one entry: pressing the button twice must not
-- make them look like two people when the launch list is counted.
create unique index if not exists shop_waitlist_email_item_idx
  on public.shop_waitlist (lower(email), coalesce(item_id, ''));

create index if not exists shop_waitlist_created_idx
  on public.shop_waitlist (created_at desc);

alter table public.shop_waitlist enable row level security;
