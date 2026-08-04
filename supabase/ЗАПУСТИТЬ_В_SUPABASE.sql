-- ============================================================
--  PYTHON METHOD CENTER — ВСЁ, ЧТО НУЖНО ПРОГНАТЬ В SUPABASE
--  Один файл. Скопировать целиком → SQL Editor → Run.
--  Запускать можно сколько угодно раз: повторный запуск ничего
--  не ломает и не стирает данные.
-- ============================================================
--
--  Что внутри (8 частей):
--    1. Запуск: уведомления команде, Stripe-вебхук, гостевая поддержка
--    2. Реферальная программа: кто кого пригласил
--    3. Токены: начисление и списание как скидка
--    4. Защита ИИ-помощника от наплыва: суточные счётчики
--    5. Сохранение переписки с ИИ — только у тех, кто в аккаунте
--    6. Тестовый доступ за 3 $ — отдельный вид оплаты
--    7. Данные клиента: адрес доставки формулы и заказов
--    8. Бесплатные инструменты: график динамики показателей и трекер добавок
--
--  В самом конце файл сам покажет таблицу с проверкой: что создано.
--  Две последние строки таблицы — про хранилища файлов. Их создают
--  не здесь, а в разделе Storage; проверка просто показывает, есть они
--  или нет.
-- ============================================================


-- ============================================================
-- ЧАСТЬ 1. ЗАПУСК ПЛАТФОРМЫ
-- ============================================================

-- 1.1 Журнал доставки внешних уведомлений (Telegram).
create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  dedupe_key text not null unique,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notification_events is
  'External notification delivery log (Telegram/email). status: pending | sent | failed | skipped. dedupe_key prevents duplicate sends per source event.';

create index if not exists notification_events_status_idx
  on public.notification_events (status, created_at desc);

alter table public.notification_events enable row level security;

-- 1.2 Защита от повторной обработки события Stripe.
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  created_at timestamptz not null default now()
);

comment on table public.stripe_events is
  'Processed Stripe webhook event ids. Insert-first guarantees each event is handled once even on redelivery.';

alter table public.stripe_events enable row level security;

-- 1.3 Одна оплата — одна запись, даже если Stripe пришлёт событие дважды.
create unique index if not exists payments_processor_reference_key
  on public.payments (processor_reference)
  where processor_reference is not null;

-- 1.4 Обращения в поддержку без аккаунта.
alter table public.support_requests alter column profile_id drop not null;
alter table public.support_requests
  add column if not exists contact_email text;

comment on column public.support_requests.contact_email is
  'Reply-to email for guest (no-account) requests submitted via the public support form.';


-- ============================================================
-- ЧАСТЬ 2. РЕФЕРАЛЬНАЯ ПРОГРАММА
-- ============================================================

-- 2.1 Личный код приглашения у каждого клиента (формат PM-XXXXXX).
alter table public.profiles
  add column if not exists referral_code text;

create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code)
  where referral_code is not null;

comment on column public.profiles.referral_code is
  'Personal referral token shared by the client (format PM-XXXXXX). Generated lazily on first view of the cabinet.';

-- 2.2 Кто кого пригласил: одна строка на приглашённого человека.
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_profile_id uuid not null references public.profiles(id) on delete cascade,
  referred_profile_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referrals_referred_unique unique (referred_profile_id),
  constraint referrals_no_self check (referrer_profile_id <> referred_profile_id)
);

comment on table public.referrals is
  'Referral attribution: who invited whom. Conversion status is derived from cases and payments, not stored here.';

create index if not exists referrals_referrer_idx
  on public.referrals (referrer_profile_id, created_at desc);

drop trigger if exists set_referrals_updated_at on public.referrals;
create trigger set_referrals_updated_at
before update on public.referrals
for each row execute function public.set_updated_at();

alter table public.referrals enable row level security;

drop policy if exists "referrals_select_own" on public.referrals;
create policy "referrals_select_own"
on public.referrals for select
to authenticated
using (referrer_profile_id = auth.uid());


-- ============================================================
-- ЧАСТЬ 3. ТОКЕНЫ (реферальная награда и скидка)
-- ============================================================

-- Только добавление записей, никогда не изменение баланса:
-- баланс всегда = сумма всех начислений и списаний.
create table if not exists public.token_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null,
  reference_id text,
  note text,
  created_at timestamptz not null default now()
);

comment on table public.token_transactions is
  'Append-only ledger of referral tokens. Balance = sum(amount). 1 token = 1 USD of discount.';

create index if not exists token_transactions_profile_idx
  on public.token_transactions (profile_id, created_at desc);

create unique index if not exists token_transactions_reason_reference_key
  on public.token_transactions (profile_id, reason, reference_id)
  where reference_id is not null;

alter table public.token_transactions enable row level security;

drop policy if exists "token_transactions_select_own" on public.token_transactions;
create policy "token_transactions_select_own"
on public.token_transactions for select
to authenticated
using (profile_id = auth.uid());


-- ============================================================
-- ЧАСТЬ 4. ЗАЩИТА ИИ-ПОМОЩНИКА ОТ НАПЛЫВА
-- ============================================================

-- Суточные счётчики сообщений. Адреса посетителей не хранятся —
-- только их хеш, по которому невозможно узнать человека.
create table if not exists public.assistant_usage (
  bucket_key text not null,
  window_date date not null default (now() at time zone 'utc')::date,
  message_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (bucket_key, window_date)
);

comment on table public.assistant_usage is
  'Daily message counters for the public AI assistant: per visitor (hashed) and platform-wide. Protects the budget from coordinated abuse.';

create index if not exists assistant_usage_window_idx
  on public.assistant_usage (window_date desc);

alter table public.assistant_usage enable row level security;

-- Посчитать сообщение и сразу сказать, не превышен ли лимит.
create or replace function public.bump_assistant_usage(
  p_bucket_key text,
  p_limit integer
)
returns table (allowed boolean, used integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
begin
  insert into public.assistant_usage (bucket_key, window_date, message_count)
  values (p_bucket_key, (now() at time zone 'utc')::date, 1)
  on conflict (bucket_key, window_date)
  do update set
    message_count = public.assistant_usage.message_count + 1,
    updated_at = now()
  returning public.assistant_usage.message_count into v_used;

  return query select v_used <= p_limit, v_used;
end;
$$;

revoke all on function public.bump_assistant_usage(text, integer) from public;
revoke all on function public.bump_assistant_usage(text, integer) from anon;
revoke all on function public.bump_assistant_usage(text, integer) from authenticated;

-- Уборка старых счётчиков.
create or replace function public.purge_assistant_usage()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.assistant_usage
  where window_date < (now() at time zone 'utc')::date - interval '30 days';
$$;


-- ============================================================
-- ЧАСТЬ 5. СОХРАНЕНИЕ ПЕРЕПИСКИ С ИИ
-- Переписка сохраняется только у тех, кто вошёл в аккаунт:
-- зарегистрировался или оплатил. У обычного посетителя сайта
-- не сохраняется ничего.
-- ============================================================

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.client_cases(id) on delete set null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  tier text not null default 'registered',
  created_at timestamptz not null default now()
);

comment on table public.assistant_messages is
  'Сохранённые переписки с ИИ у тех, кто в аккаунте. Гости не сохраняются.';

create index if not exists assistant_messages_profile_idx
  on public.assistant_messages (profile_id, created_at);

create index if not exists assistant_messages_case_idx
  on public.assistant_messages (case_id, created_at);

alter table public.assistant_messages enable row level security;

-- Человек читает только свою переписку. Пишет её сервер, команда
-- центра читает через служебный доступ.
drop policy if exists "assistant_messages_select_own" on public.assistant_messages;
create policy "assistant_messages_select_own"
on public.assistant_messages for select
to authenticated
using (profile_id = auth.uid());


-- ============================================================
-- ЧАСТЬ 6. ТЕСТОВЫЙ ДОСТУП ЗА 3 $
-- Отдельный вид оплаты для приглашённых тестировщиков из разных
-- стран: они проходят настоящий путь оплаты, а тестовые деньги
-- не попадают в отчёт о выручке вместе с настоящими.
-- ============================================================

alter type public.payment_product add value if not exists 'test_access';


-- ============================================================
-- ЧАСТЬ 7. ДАННЫЕ КЛИЕНТА
-- Адрес доставки: клиент сам вносит и правит его в кабинете,
-- в разделе «Мой кейс» → «Мои данные». Нужен для доставки
-- формулы Professor Python и заказов из магазина.
-- ============================================================

alter table public.profiles
  add column if not exists delivery_address text;


-- ============================================================
-- ЧАСТЬ 8. БЕСПЛАТНЫЕ ИНСТРУМЕНТЫ: ДИНАМИКА И ТРЕКЕР ДОБАВОК
-- ============================================================

-- Two free care tools for every registered person.
--
-- 1) health_metrics — the person's own lab values over time, entered by
--    the person (the platform never invents numbers and does not read
--    storage files). The chart on /cabinet/metrics is drawn from these
--    rows and nothing else.
-- 2) supplements + supplement_intakes — what the person takes and when,
--    with a daily check-off. The person decides what to enter; the AI only
--    helps arrange times; Professor Python owns any real recommendation.
--
-- All three tables are the person's own data: unlike case decisions,
-- they are client-owned, so clients may insert, update and delete their
-- own rows directly under RLS.

create table if not exists public.health_metrics (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- Free-form but trimmed/collapsed on write: "Гемоглобин", "Ферритин".
  metric_name text not null,
  value numeric not null,
  unit text,
  measured_at date not null,
  created_at timestamptz not null default now()
);

comment on table public.health_metrics is
  'Client-entered lab values for the dynamics chart. The platform never generates these numbers itself.';

create index if not exists health_metrics_profile_idx
  on public.health_metrics (profile_id, metric_name, measured_at);

alter table public.health_metrics enable row level security;

drop policy if exists "health_metrics_select_own" on public.health_metrics;
create policy "health_metrics_select_own"
on public.health_metrics for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "health_metrics_insert_own" on public.health_metrics;
create policy "health_metrics_insert_own"
on public.health_metrics for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "health_metrics_delete_own" on public.health_metrics;
create policy "health_metrics_delete_own"
on public.health_metrics for delete
to authenticated
using (profile_id = auth.uid());

create table if not exists public.supplements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  dose text,
  -- Times of day as "HH:MM" strings, e.g. ["08:00","20:00"].
  times jsonb not null default '[]'::jsonb,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.supplements is
  'Client-entered supplement schedule. What to take is the client''s and Professor Python''s decision — never the AI''s.';

create index if not exists supplements_profile_idx
  on public.supplements (profile_id, is_active);

alter table public.supplements enable row level security;

drop policy if exists "supplements_select_own" on public.supplements;
create policy "supplements_select_own"
on public.supplements for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "supplements_insert_own" on public.supplements;
create policy "supplements_insert_own"
on public.supplements for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "supplements_update_own" on public.supplements;
create policy "supplements_update_own"
on public.supplements for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "supplements_delete_own" on public.supplements;
create policy "supplements_delete_own"
on public.supplements for delete
to authenticated
using (profile_id = auth.uid());

-- One check-off per supplement, per day, per time slot.
create table if not exists public.supplement_intakes (
  id uuid primary key default gen_random_uuid(),
  supplement_id uuid not null references public.supplements(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  taken_on date not null,
  time_slot text not null,
  taken_at timestamptz not null default now(),
  constraint supplement_intakes_unique unique (supplement_id, taken_on, time_slot)
);

comment on table public.supplement_intakes is
  'Daily check-offs of the supplement schedule.';

create index if not exists supplement_intakes_profile_day_idx
  on public.supplement_intakes (profile_id, taken_on);

alter table public.supplement_intakes enable row level security;

drop policy if exists "supplement_intakes_select_own" on public.supplement_intakes;
create policy "supplement_intakes_select_own"
on public.supplement_intakes for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "supplement_intakes_insert_own" on public.supplement_intakes;
create policy "supplement_intakes_insert_own"
on public.supplement_intakes for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "supplement_intakes_delete_own" on public.supplement_intakes;
create policy "supplement_intakes_delete_own"
on public.supplement_intakes for delete
to authenticated
using (profile_id = auth.uid());

-- ============================================================
-- ПРОВЕРКА. Результат этого запроса вы увидите на экране.
-- Всё должно быть «✅ есть».
-- ============================================================

select "Что проверяем", "Статус" from (
  select 1 as n,
    'Таблица уведомлений (notification_events)' as "Что проверяем",
    case when to_regclass('public.notification_events') is not null
      then '✅ есть' else '❌ НЕТ' end as "Статус"
  union all select 2,
    'Таблица событий Stripe (stripe_events)',
    case when to_regclass('public.stripe_events') is not null
      then '✅ есть' else '❌ НЕТ' end
  union all select 3,
    'Защита от двойной оплаты (индекс payments)',
    case when exists (
      select 1 from pg_indexes
      where schemaname = 'public' and indexname = 'payments_processor_reference_key'
    ) then '✅ есть' else '❌ НЕТ' end
  union all select 4,
    'Поддержка без аккаунта (support_requests.contact_email)',
    case when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'support_requests'
        and column_name = 'contact_email'
    ) then '✅ есть' else '❌ НЕТ' end
  union all select 5,
    'Код приглашения (profiles.referral_code)',
    case when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles'
        and column_name = 'referral_code'
    ) then '✅ есть' else '❌ НЕТ' end
  union all select 6,
    'Таблица приглашений (referrals)',
    case when to_regclass('public.referrals') is not null
      then '✅ есть' else '❌ НЕТ' end
  union all select 7,
    'Таблица токенов (token_transactions)',
    case when to_regclass('public.token_transactions') is not null
      then '✅ есть' else '❌ НЕТ' end
  union all select 8,
    'Счётчики ИИ-помощника (assistant_usage)',
    case when to_regclass('public.assistant_usage') is not null
      then '✅ есть' else '❌ НЕТ' end
  union all select 9,
    'Функция счётчика (bump_assistant_usage)',
    case when exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'bump_assistant_usage'
    ) then '✅ есть' else '❌ НЕТ' end
  union all select 10,
    'Сохранение переписки с ИИ (assistant_messages)',
    case when to_regclass('public.assistant_messages') is not null
      then '✅ есть' else '❌ НЕТ' end
  union all select 11,
    'Тестовый доступ за 3 $ (вид оплаты test_access)',
    case when exists (
      select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
      where t.typname = 'payment_product' and e.enumlabel = 'test_access'
    ) then '✅ есть' else '❌ НЕТ' end
  union all select 12,
    'Адрес доставки клиента (profiles.delivery_address)',
    case when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles'
        and column_name = 'delivery_address'
    ) then '✅ есть' else '❌ НЕТ' end
  -- Хранилища создаются не этим файлом, а в разделе Storage. Проверка
  -- здесь для того, чтобы не забыть их создать.
  union all select 13,
    'График динамики (health_metrics)',
    case when to_regclass('public.health_metrics') is not null
      then '✅ есть' else '❌ НЕТ' end
  union all select 14,
    'Трекер добавок (supplements)',
    case when to_regclass('public.supplements') is not null
      then '✅ есть' else '❌ НЕТ' end
  union all select 15,
    'Отметки приёма (supplement_intakes)',
    case when to_regclass('public.supplement_intakes') is not null
      then '✅ есть' else '❌ НЕТ' end
  union all select 16,
    'Хранилище документов (Storage: client-documents)',
    case when exists (
      select 1 from storage.buckets where id = 'client-documents'
    ) then '✅ есть' else '❌ НЕТ — создать в разделе Storage' end
  union all select 17,
    'Хранилище голосовых (Storage: case-audio)',
    case when exists (
      select 1 from storage.buckets where id = 'case-audio'
    ) then '✅ есть' else '❌ НЕТ — создать в разделе Storage' end
) as checks
order by n;
