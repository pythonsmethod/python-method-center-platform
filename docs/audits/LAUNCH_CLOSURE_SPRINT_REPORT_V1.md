# LAUNCH CLOSURE SPRINT REPORT — V1

Дата: 2026-07-23
Baseline: `c66b7e2319f51d926f4864f2e0e653ff7e667c9f` (main, совпал с рабочей копией — расхождений после baseline не было)
Цель: закрыть 4 подтверждённых P0-блокера из `CLAUDE_FINAL_LAUNCH_READINESS_AUDIT_V2.md` перед первым контролируемым клиентом.

Общий контекст верификации: код написан, собран и протестирован в среде разработки.
Продакшен-верификация из этой среды невозможна (нет доступа к продакшен-домену и
секретам) — для каждого P0 ниже перечислены точные ручные шаги владельца, после
которых статус переходит в CLOSED. Ни один P0 не помечен CLOSED без живого
подтверждения — это сделано намеренно, по правилам спринта.

---

## P0-1 — External Notifications

**Before.** Ни одно событие (красный флаг, сообщение клиента, обращение, оплата)
не покидало базу данных. Единственный способ узнать — открыть вкладку /admin.

**Implementation.**
- Канал: **Telegram** (минимально допустимый по ТЗ; email — в бэклоге).
- `lib/notifications/telegram.ts` — отправка с таймаутом 8с и **retry** (3 попытки,
  паузы 0.5с/1.5с).
- `lib/notifications/notify.ts` — `notifyTeam()`: пишет запись в новую таблицу
  `notification_events` (**delivery status**: pending/sent/failed/skipped,
  **attempts**, **last_error** — failure logging), **deduplication** через
  уникальный `dedupe_key` (одно событие-источник = максимум одно уведомление,
  даже при повторном запуске обработчика). Никогда не бросает исключение —
  сбой уведомления не ломает пользовательский поток.
- Подключено к событиям:
  1. **красный флаг** — `lib/assistant/red-flags.ts`: event ID, client/case ID
     (или «гость — связаться нельзя»), тип риска, severity
     (requires_immediate_review), timestamp, ссылка на админку, безопасный
     фрагмент ≤160 символов (полные медданные не покидают платформу), явное
     «требует проверки». **Acknowledgement** остаётся в панели эскалаций
     (кнопка «Отметить обработанным» — статус в `escalation_events`).
  2. **сообщение клиента** — текст (`lib/messages/actions.ts`) и голосовое
     (`app/api/messages/audio/route.ts`); содержимое сообщения в уведомление
     не включается.
  3. **обращение в поддержку** — из кабинета (`lib/support/actions.ts`) и от
     гостя (`lib/support/public-actions.ts`).
  4. **успешная оплата** — из Stripe-webhook (см. P0-3), включая случай
     «оплата без привязки — нужна ручная проверка».
  5. **ошибка обработки критического события** — сбой записи красного флага,
     сбой конвейера, сбой обработки Stripe-события, сбой активации периода
     сопровождения → отдельное уведомление kind=processing_error.
- Запись в БД сама по себе НЕ считается успешной обработкой: статус доставки
  фиксируется отдельно, неуспех виден в `notification_events.status='failed'`.

**Files changed.** `lib/notifications/{telegram,notify,format}.ts` (новые),
`lib/assistant/red-flags.ts`, `app/api/assistant/client/route.ts`,
`lib/messages/actions.ts`, `app/api/messages/audio/route.ts`,
`lib/support/actions.ts`.

**Migrations.** `supabase/migrations/20260723120000_launch_closure_sprint.sql`
(таблица `notification_events` + RLS).

**Environment variables.** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`,
`NEXT_PUBLIC_SITE_URL` (ссылки в уведомлениях). Без них уведомления получают
статус `skipped` — платформа продолжает работать.

**Tests.** `tests/notifications-format.test.ts` (усечение фрагмента — граница
160 символов, санитизация переносов; сборка текста). 25/25 vitest,
typecheck OK, production build OK.

**Production evidence.** Пока отсутствует — требуется: (1) прогнать миграцию,
(2) создать бота у @BotFather, добавить env в Vercel, Redeploy, (3) отправить
тестовое сообщение в чат кейса и увидеть его в Telegram. Контролируемый тест
красного флага — только на тестовом аккаунте, НЕ создавая ложное кризисное
событие в проде без пометки «ТЕСТ» в тексте.

**Fallback.** Env не заданы / Telegram недоступен → статус skipped/failed в
`notification_events`, admin-панель остаётся полным источником; ручной режим
(проверка админки 3×/день) действует до верификации.

**Final status: PARTIALLY CLOSED** (код и тесты готовы; ждёт env + миграции +
живого подтверждения).

---

## P0-2 — Password Recovery

**Before.** Восстановления пароля не существовало вовсе: забыл пароль —
навсегда потерял доступ к кейсу.

**Implementation.** Полный flow:
1. Ссылка **«Забыли пароль?»** на /login (обе локали).
2. `/recovery` — форма email (`app/(auth)/recovery/`).
3. `requestPasswordReset` → Supabase `resetPasswordForEmail` с redirect на
   `/auth/callback?next=/reset-password`. Ответ формы одинаков для
   существующего и несуществующего email — **enumeration невозможна**
   (игнорируются все ошибки, кроме rate-limit).
4. Recovery callback — существующий `/auth/callback` теперь **проверяет
   результат** `exchangeCodeForSession`: просроченная/повторно использованная
   ссылка → редирект `/recovery?message=link-invalid` (для recovery-потока)
   или `/login?message=link-invalid` (для подтверждения регистрации) с
   человеческим объяснением.
5. `/reset-password` — форма нового пароля (два поля, min 6, max 72,
   совпадение); без recovery-сессии показывает «ссылка устарела» + кнопку
   запроса новой.
6. Подтверждение успеха + кнопка «Перейти в кабинет».

**Files changed.** `lib/auth/actions.ts` (+2 действия),
`lib/auth/validation.ts` (новый), `app/(auth)/recovery/*`,
`app/(auth)/reset-password/*` (новые), `app/auth/callback/route.ts`,
`app/(auth)/login/page.tsx`, `lib/i18n/dictionaries.ts` (ru/en),
`app/globals.css` (.auth-help).

**Migrations.** Не требуются.

**Environment variables.** Существующие Supabase-переменные. Требование к
конфигурации: в Supabase Dashboard → Auth → URL Configuration добавить
`https://pythonmethodcenter.com/auth/callback` в Redirect URLs (если ещё не
добавлен со времён подтверждения регистрации).

**Tests.** `tests/auth-validation.test.ts`: email известный/неизвестный
(одинаковый ответ — проверено на уровне кода действия), несовпадающие пароли,
короткие/пустые пароли. Сценарии «просроченная ссылка» и «повторное
использование» реализованы через обработку ошибки exchangeCodeForSession
(ветка покрыта код-ревью; живой тест — чек-лист ниже). Smoke: /recovery и
/reset-password рендерятся (200).

**Production evidence.** Требуется живой прогон: запрос ссылки → письмо →
смена пароля → вход; повторное открытие той же ссылки → экран «ссылка
устарела».

**Fallback.** Если письмо не приходит — гостевая форма /support (P0-4) с
категорией «Не получается войти».

**Final status: PARTIALLY CLOSED** (код полный; ждёт проверки redirect URL и
живого прогона на проде).

---

## P0-3 — Stripe Webhook and Automatic Payment Recording

**Before.** Webhook отсутствовал; оплата попадала в систему только после
ручного ввода сотрудником; клиент после оплаты видел «Оплат пока нет»;
команда об оплате не узнавала.

**Implementation.**
- Payment Links **сохранены** без изменений.
- `stripe` SDK добавлен в зависимости; `lib/payments/stripe.ts` — клиент,
  маппинг суммы→продукт (ровно $1,440 → 5 недель, $3,675 → 100 дней; всё
  прочее → ручная проверка, никаких догадок), расчёт периода сопровождения
  (35/100 дней).
- `app/api/stripe/webhook/route.ts`:
  - **signature verification** (`constructEvent`, raw body); нет/неверная
    подпись → 400 (проверено живым запросом: оба случая возвращают 400);
  - **idempotency**: insert-first в новую таблицу `stripe_events`
    (уникальный event id) — повторная доставка события = no-op; плюс
    уникальный индекс `payments.processor_reference` — двойная запись одной
    оплаты невозможна даже наперегонки с ручным вводом;
  - **event logging**: каждое событие остаётся в `stripe_events`;
  - обработаны: `checkout.session.completed`,
    `checkout.session.async_payment_succeeded` (оплата задержанными
    методами), `checkout.session.async_payment_failed`,
    `payment_intent.payment_failed`, `charge.refunded`;
  - **автозапись оплаты** (status=paid, сумма, валюта, референс
    payment_intent, metadata с event/session id) + **автоактивация
    service_period** (active, старт сейчас, конец через 35/100 дней) +
    уведомление команде;
  - привязка к клиенту: **client_reference_id** (профиль вошедшего клиента
    добавляется к ссылке Stripe на /payment) → fallback по email
    (регистронезависимо) → иначе **громкое уведомление «нужна ручная
    привязка»** — оплата никогда не привязывается угадыванием;
  - refund: payments.status → refunded + refunded_at + уведомление;
  - сбой обработки → уведомление processing_error, событие не
    перезапускается в ту же ошибку.
- Browser redirect (/payment/success) **не является** доказательством оплаты —
  страница осталась информационной, истина только из webhook.
- Кабинет клиента читает payments — после webhook оплата видна без участия
  сотрудника; тексты success-страницы обновлены («привязывается автоматически
  в течение нескольких минут», обе локали).
- Ручная запись оплаты сотрудником сохранена как fallback (уникальный индекс
  защищает от дублей в обоих направлениях).

**Обязательные сценарии — покрытие.**
1. успешная оплата → автозапись (код + чек-лист живого теста);
2. повторный webhook → duplicate no-op (stripe_events, код);
3. webhook раньше возврата клиента → запись уже есть к моменту открытия
   кабинета (порядок не важен, оба пути независимы);
4. возврат клиента раньше webhook → success-страница обещает «несколько
   минут», кабинет обновится после события;
5. failed payment → уведомление команде;
6. неизвестный client reference → email-fallback → иначе ручная привязка с
   уведомлением;
7. неверная подпись → 400 (проверено живо на дев-сервере);
8. refund → статус refunded + уведомление.

**Files changed.** `package.json` (+stripe), `lib/payments/stripe.ts` (новый),
`app/api/stripe/webhook/route.ts` (новый), `app/(payment)/payment/page.tsx`
(client_reference_id), `lib/i18n/dictionaries.ts` (success-тексты).

**Migrations.** Та же миграция спринта: `stripe_events` + уникальный индекс
`payments.processor_reference`.

**Environment variables.** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
(+ существующие NEXT_PUBLIC ссылки). Test/live разделение: использовать live
ключи в Vercel Production, test-ключи — только в тестовой среде.

**Tests.** `tests/stripe-product-mapping.test.ts` (маппинг сумм — включая
«похожие» суммы → null; длительности периодов). Подпись — живой негативный
тест (400/400). Идемпотентность — insert-first код + уникальные ограничения
(SQL); живой тест повторной доставки — кнопкой «Resend» в Stripe Dashboard
(чек-лист).

**Production evidence.** Требуется: (1) миграция, (2) создать webhook endpoint
в Stripe Dashboard на `https://pythonmethodcenter.com/api/stripe/webhook`
с перечисленными событиями, (3) внести env в Vercel + Redeploy, (4) тестовая
оплата $5-ссылкой (или test mode) → оплата сама появилась в кабинете →
Resend события → второй записи нет.

**Fallback.** Webhook не настроен/упал → прежний ручной ввод оплат полностью
работоспособен; уведомление «нужна ручная привязка» для нераспознанных оплат.

**Final status: PARTIALLY CLOSED** (код, тесты и негативная проверка подписи
готовы; ждёт настройки Stripe Dashboard + env + живой тестовой оплаты).

---

## P0-4 — Public Support Access

**Before.** /support для гостя — тупик: ни формы, ни контакта; туда же
направлялись люди с проблемами входа/оплаты и кризисные гости.

**Implementation.** Страница /support переработана (обе локали):
- **гостевая форма** без входа: email для ответа, категория (вход / оплата /
  техническая / другое), сообщение (10–4000 симв.), **consent-чекбокс** на
  обработку email; лишние медицинские данные не запрашиваются;
- **spam protection**: honeypot-поле + **rate limiting** (5 обращений/час
  с IP, per-instance) + серверная валидация;
- запись в `support_requests` с `profile_id = null` и `contact_email`
  (миграция снимает NOT NULL); гостевые заявки видны в админ-очереди с
  пометкой «Гость (без аккаунта)» и email для ответа;
- **уведомление support-команде** через notifyTeam (+ аудит-запись остаётся
  в таблице обращений);
- **понятное время ответа**: «в течение 24 часов (в рабочие дни)» — в
  описании страницы, в форме и в подтверждении отправки;
- **заметное экстренное предупреждение** — вернулся полноразмерный жёлтый
  блок (не мелкий шрифт) именно на этой странице;
- **инструкции**: блок «Забыли пароль?» со ссылкой на /recovery, блок
  «Оплатили, но оплата не видна?», кнопка входа.

**Files changed.** `app/(support)/support/page.tsx`,
`components/support/PublicSupportForm.tsx` (новый),
`lib/support/public-actions.ts` (новый), `lib/support/validation.ts` (новый),
`lib/support/queries.ts` (contact_email), `app/(admin)/admin/requests/page.tsx`,
`lib/i18n/dictionaries.ts` (ru/en).

**Migrations.** Та же миграция спринта (`profile_id` nullable +
`contact_email`).

**Environment variables.** Не требуются (уведомления — см. P0-1).

**Tests.** `tests/support-validation.test.ts` (валидная заявка, honeypot,
email, категория, длина, consent). Smoke: /support 200, форма и экстренный
блок рендерятся (проверено grep по HTML живого дев-сервера).

**Production evidence.** Требуется: после миграции отправить гостевую заявку
с продакшена и увидеть её в /admin/requests (и в Telegram при настроенном
боте).

**Fallback.** Если Supabase недоступен, форма честно просит написать позже;
клиентская форма в кабинете не изменилась.

**Final status: PARTIALLY CLOSED** (код готов и проверен локально; ждёт
миграции + одной живой гостевой заявки).

---

## Дополнительная задача — README

README переписан по фактической реализации: убраны ложные «Not implemented:
AI runtime, red-flag workflow, threaded messaging» (всё это давно работает);
добавлены реальные маршруты, окружение, настройка Stripe-webhook, ссылка на
свежие аудиты; известные ограничения перечислены явно, ничего не
рекламируется сверх проверенного. Статус: **CLOSED**.

---

## Тестирование (сводка)

| Проверка | Результат |
|---|---|
| typecheck (`tsc --noEmit`) | ✅ OK |
| production build (`next build`) | ✅ OK (все новые маршруты в манифесте) |
| lint | ✅ в составе build (Next lint-этап пройден) |
| unit tests (vitest) | ✅ 25/25: маппинг Stripe-сумм, валидация паролей/email, усечение фрагментов, валидация гостевой формы |
| webhook signature | ✅ живой негативный тест: нет подписи → 400, неверная подпись → 400; без конфигурации → 503 (fail-closed) |
| public support smoke | ✅ /support 200, форма + экстренный блок в HTML |
| protected route smoke | ✅ маршруты рендерятся; в дев-среде без Supabase показывают setup-notice (штатно) |
| password recovery tests | ✅ юнит (валидация, анти-enumeration в коде); живой e2e — в чек-листе владельца |
| Stripe idempotency | ✅ на уровне схемы и кода (insert-first + уникальные ограничения); живой Resend-тест — в чек-листе |
| integration/e2e (registration → … → notification) | ⛔ невозможно из этой среды (нет секретов) — вынесено в чек-лист владельца, шаги описаны |

## Production Safety — чек-лист владельца (до объявления CLOSED)

1. **SQL-миграция**: выполнить `20260723120000_launch_closure_sprint.sql` в
   Supabase SQL Editor (один раз).
2. **Vercel env** (Production, с привязкой к проекту): `TELEGRAM_BOT_TOKEN`,
   `TELEGRAM_CHAT_ID`, `STRIPE_SECRET_KEY` (live), `STRIPE_WEBHOOK_SECRET`,
   `NEXT_PUBLIC_SITE_URL=https://pythonmethodcenter.com` → Redeploy.
3. **Stripe Dashboard** → Webhooks → Add endpoint
   `https://pythonmethodcenter.com/api/stripe/webhook` (события из README) →
   скопировать signing secret в env из п.2.
4. **Supabase Auth** → URL Configuration → убедиться, что
   `https://pythonmethodcenter.com/auth/callback` в Redirect URLs.
5. **Получатели уведомлений**: убедиться, что в Telegram-чате только команда.
6. Тестовые уведомления помечать словом «ТЕСТ»; тестовый red-flag — только с
   тестового аккаунта; чувствительные данные в уведомлениях ограничены
   160-символьным фрагментом (только red-flag) — проверить глазами первое
   уведомление.
7. Live-проверки: recovery-цикл; гостевая заявка; тестовая оплата → авто-
   запись → Resend → нет дубля.

## Итог

- **CLOSED:** README.
- **PARTIALLY CLOSED (код+тесты готовы, ждут env/миграции/живой проверки):**
  P0-1, P0-2, P0-3, P0-4.
- **BLOCKED / NOT VERIFIED:** нет.

После выполнения чек-листа владельцем все четыре P0 переходят в CLOSED без
дополнительного кода.
