# MOBILE PLATFORM DISCOVERY V1

**Тип документа:** read-only аудит существующей веб-платформы для подготовки
мобильного приложения (iOS + Android).
**Дата аудита:** 2026-08-01
**Ветка аудита:** `mobile/architecture-discovery`
**Коммит на момент аудита:** `f681584` («Rebuild the cabinet as a workspace»)

**Границы этого документа.** Ни одна строка программного кода, схемы БД,
конфигурации или production-настройки не изменялась. Ниже зафиксировано
только то, что реально присутствует в репозитории, с ссылками на файлы и
строки. Всё, что не подтверждено кодом, вынесено в раздел «Неизвестное и
неподтверждённое» и в `MOBILE_DISCOVERY_OPEN_QUESTIONS_V1.md`.

---

## 1. Executive summary

Платформа — **единое монолитное Next.js 15 App Router приложение**
(`package.json:18`), где роль backend выполняет **Supabase**
(Postgres + Auth + Storage). Отдельного backend-сервиса, отдельного API-слоя
или версионированного REST/GraphQL API **не существует**.

Ключевой вывод для мобильной разработки:

> Бизнес-логика платформы реализована преимущественно через **Next.js Server
> Actions** — 20 экспортируемых действий в 15 файлах `lib/*/actions.ts`.
> Server Actions — это внутренний RPC-протокол React/Next.js, привязанный к
> сборке, к cookie-сессии и к недокументированному формату запроса. **Они
> недоступны и не должны вызываться нативным мобильным клиентом.**

HTTP-эндпоинтов, пригодных для мобильного клиента, всего **четыре**:
`/api/assistant/client`, `/api/assistant/staff`, `/api/messages/thread`,
`/api/messages/audio`. Оставшиеся три route handler'а — это webhook Stripe
(server-to-server), auth-callback (браузерный редирект) и просмотр документа
персоналом (браузерный редирект).

При этом **фундамент для мобильного приложения существует и он крепкий**:

- Supabase Auth выдаёт стандартные JWT access/refresh токены — мобильный SDK
  Supabase может авторизоваться напрямую, без Next.js.
- RLS включён на всех 19 таблицах и корректно ограничен `auth.uid()`
  (`supabase/migrations/20260621220000_create_core_schema.sql:449-587`), то
  есть **чтение собственных данных клиента мобильный клиент может выполнять
  напрямую через Supabase SDK**.
- Загрузка документов в Storage уже сейчас идёт напрямую из браузера с
  anon-ключом и пользовательской сессией
  (`app/(client)/cabinet/DocumentUploadPanel.tsx:157-163`) — та же схема
  работает и на мобильном.

Главный дефицит — **запись данных**. Почти все клиентские записи (анкета,
отправка сообщения, обращение в поддержку, погашение токенов, фиксация
согласия) идут через Server Actions с использованием **service-role ключа**,
который нельзя поместить в мобильное приложение ни при каких условиях.

**Итоговый вердикт: READY WITH GAPS** — детали в разделе 15.

---

## 2. Карта архитектуры

### 2.1 Физическая топология (подтверждено)

```
┌──────────────────────────────────────────────────────────────┐
│  Браузер (единственный существующий клиент)                  │
│  React 19 client components + Server Components HTML         │
│  cookies: sb-* (Supabase Auth), pm-locale, pm-ref            │
└───────────────┬──────────────────────────────┬───────────────┘
                │                              │
   Server Actions (RPC)              Прямой Supabase SDK
   + 4 JSON route handlers           (anon key + user JWT)
                │                              │
┌───────────────▼──────────────────────────────┼───────────────┐
│  Next.js 15 App Router (Vercel)              │               │
│  middleware.ts — refresh сессии + ?ref=      │               │
│  ├─ app/(public)   лендинг, магазин, оферта  │               │
│  ├─ app/(auth)     login / recovery / reset  │               │
│  ├─ app/(client)   onboarding + cabinet      │               │
│  ├─ app/(payment)  тарифы, PayPal, alt       │               │
│  ├─ app/(support)  публичная поддержка       │               │
│  ├─ app/(admin)    рабочее место команды     │               │
│  └─ app/api/*      4 клиентских + webhook    │               │
│                                              │               │
│  lib/  — вся бизнес-логика (server-only)     │               │
│  service-role ключ живёт ТОЛЬКО здесь        │               │
└───────┬──────────────────┬───────────────────┼───────────────┘
        │                  │                   │
        │                  │                   │
┌───────▼────────┐  ┌──────▼───────┐  ┌────────▼──────────────┐
│ Anthropic API  │  │ Telegram Bot │  │ Supabase              │
│ OpenAI API     │  │ API          │  │ • Postgres (19 таблиц)│
│ (арбитр 2-х    │  │ (уведомления │  │ • Auth (JWT)          │
│  моделей)      │  │  команде)    │  │ • Storage (2 бакета)  │
└────────────────┘  └──────────────┘  └───────────────────────┘
        │
┌───────▼────────┐
│ Stripe         │  Payment Links (out-of-app) + webhook внутрь
│ PayPal (ссылки)│
└────────────────┘
```

### 2.2 Логическая структура репозитория

| Путь | Содержание | Реальность |
|---|---|---|
| `app/` | Все маршруты App Router, 7 route handlers | **живой код** |
| `components/` | 27 client + server компонентов | **живой код** |
| `lib/` | 21 подпапка: вся бизнес-логика, БД-запросы, интеграции | **живой код** |
| `supabase/migrations/` | 14 SQL-миграций, 1218 строк | **живой код** |
| `middleware.ts` | Обновление сессии + захват `?ref=` | **живой код** |
| `tests/` | 12 vitest-файлов (только чистые функции) | **живой код** |
| `docs/` | Архитектура, конституция, аудиты, запуск | документация |
| `admin/`, `ai/`, `backend/`, `client-cabinet/`, `database/`, `payments/`, `support/`, `web/` | **только README.md — пустые заглушки** | **не код** |

Важно: восемь директорий верхнего уровня (`backend/`, `ai/`, `database/`
и т. д.) содержат **исключительно README-заглушки** («Placeholder — structure
only, no business logic yet»). Они не являются модулями и не должны вводить
в заблуждение при планировании мобильной интеграции. Реальный «backend» —
это `lib/` + `supabase/`.

### 2.3 Точки входа

| Точка входа | Файл |
|---|---|
| Корневой layout | `app/layout.tsx` |
| Middleware (каждый не-статический запрос) | `middleware.ts:29` |
| Публичный лендинг | `app/(public)/page.tsx` |
| Кабинет клиента | `app/(client)/cabinet/page.tsx:75` |
| Layout кабинета (данные для шелла) | `app/(client)/cabinet/layout.tsx:10` |
| Рабочее место персонала | `app/(admin)/admin/page.tsx` |
| Stripe webhook | `app/api/stripe/webhook/route.ts:29` |
| Auth callback | `app/auth/callback/route.ts:12` |

---

## 3. Обнаруженные технологии

| Слой | Технология | Версия | Источник |
|---|---|---|---|
| Framework | Next.js (App Router) | `^15.3.4` | `package.json:18` |
| UI | React / React DOM | `^19.1.0` | `package.json:19-20` |
| Язык | TypeScript | `^5.8.3` | `package.json:27` |
| Package manager | npm (`package-lock.json` в репозитории) | — | `package-lock.json`, `docs/deployment.md:165` |
| Runtime | Node.js ≥ 20 | — | `README.md:88` |
| БД / Auth / Storage | Supabase | `@supabase/supabase-js ^2.50.0`, `@supabase/ssr ^0.6.1` | `package.json:16-17` |
| AI (основной) | Anthropic Claude | `@anthropic-ai/sdk ^0.112.3` | `package.json:15` |
| AI (второй) | OpenAI | через `fetch`, без SDK | `lib/assistant/openai.ts` |
| Платежи | Stripe | `stripe ^22.3.2` | `package.json:21` |
| Платежи (альтернатива) | PayPal — только внешние ссылки | — | `lib/payments/paypal.ts` |
| Уведомления команде | Telegram Bot API через `fetch` | — | `lib/notifications/telegram.ts:28` |
| Тесты | Vitest | `^4.1.10` | `package.json:28` |
| Хостинг | Vercel (рекомендованный целевой) | — | `docs/deployment.md:17` |
| Стили | Один глобальный CSS-файл, без CSS-фреймворка | — | `app/globals.css` |

**Чего в стеке НЕТ** (проверено grep'ом по репозиторию):
ORM, GraphQL, tRPC, OpenAPI/Swagger-спецификации, Redis, очередей задач,
Firebase/FCM, APNs, OneSignal, Twilio/SMS, SendGrid/Resend/nodemailer/SMTP,
service worker, `manifest.json`, Supabase Realtime, WebSocket.

---

## 4. Клиентские функции веб-платформы

Полный список того, что сегодня доступно человеку-клиенту (не персоналу).
Разбиение на MVP/post-MVP — в `MOBILE_FEATURE_INVENTORY_V1.md`.

| # | Функция | Где реализована |
|---|---|---|
| 1 | Публичный лендинг с путём клиента | `app/(public)/page.tsx` |
| 2 | Переключение языка RU/EN | `components/LanguageSwitcher.tsx:10` |
| 3 | Регистрация (email + пароль) | `lib/auth/actions.ts:89` |
| 4 | Вход | `lib/auth/actions.ts:45` |
| 5 | Выход | `lib/auth/actions.ts:233` |
| 6 | Восстановление пароля (запрос письма) | `lib/auth/actions.ts:143` |
| 7 | Установка нового пароля по ссылке | `lib/auth/actions.ts:187` |
| 8 | Подтверждение email / обмен кода на сессию | `app/auth/callback/route.ts:24` |
| 9 | Анкета (onboarding) → создание кейса | `lib/onboarding/actions.ts:31` |
| 10 | Фиксация согласий (оферта + обработка данных) | `lib/onboarding/actions.ts:170-197` |
| 11 | Кабинет: «сейчас важно» — следующий шаг | `app/(client)/cabinet/page.tsx:35` |
| 12 | Кабинет: статус кейса | `lib/cases/queries.ts:27` |
| 13 | Кабинет: история кейса (lifecycle events) | `lib/cases/queries.ts:70` |
| 14 | Кабинет: список оплат | `lib/payments/queries.ts` |
| 15 | Загрузка документа (PDF/PNG/JPG/WEBP, ≤25 МБ) | `app/(client)/cabinet/DocumentUploadPanel.tsx:110` |
| 16 | Открытие своего документа по signed URL (60 с) | `app/(client)/cabinet/DocumentUploadPanel.tsx:93-95` |
| 17 | Чат по кейсу: чтение (polling 3 с) | `components/messages/CaseMessageThread.tsx:19,96` |
| 18 | Чат по кейсу: отправка текста | `lib/messages/actions.ts:16` |
| 19 | Чат по кейсу: запись и отправка голосового | `components/messages/VoiceRecorder.tsx`, `app/api/messages/audio/route.ts:26` |
| 20 | Счётчик непрочитанных от команды | `lib/messages/queries.ts:79` |
| 21 | Обращение в поддержку из кабинета | `lib/support/actions.ts:32` |
| 22 | История своих обращений | `lib/support/queries.ts` |
| 23 | Публичное обращение в поддержку без аккаунта | `lib/support/public-actions.ts:45` |
| 24 | ИИ-помощник, 3 уровня (гость/зарегистрирован/оплатил) | `app/api/assistant/client/route.ts:58`, `lib/assistant/tiers.ts:84` |
| 25 | Голосовой ввод в ИИ-чат (Web Speech API) | `components/assistant/useVoiceInput.ts` |
| 26 | Авто-эскалация «красных флагов» из ИИ-чата | `lib/assistant/red-flags.ts:32` |
| 27 | Страница тарифов + чекбокс оферты | `components/payments/PaymentPlans.tsx` |
| 28 | Оплата через Stripe Payment Link (внешняя) | `lib/payments/config.ts:62` |
| 29 | Оплата через PayPal (внешняя ссылка) | `lib/payments/paypal.ts` |
| 30 | Заявка на альтернативный способ оплаты | `lib/payments/alt-request-action.ts:43` |
| 31 | Тестовый доступ за $3 (по прямой ссылке) | `app/(payment)/payment/test/page.tsx`, `lib/payments/config.ts:42` |
| 32 | Реферальный код и панель приглашений | `components/referrals/ReferralPanel.tsx`, `lib/referrals/queries.ts` |
| 33 | Токены: баланс и история | `lib/tokens/queries.ts:31` |
| 34 | Токены → промокод Stripe (скидка) | `lib/tokens/actions.ts:25` |
| 35 | Публичная оферта (PDF) | `app/(public)/legal/offer/page.tsx` |
| 36 | Экстренное уведомление (кризисный блок) | `components/EmergencyNotice.tsx` |
| 37 | Магазин (страница) | `app/(public)/shop/page.tsx` |

---

## 5. Таблица API endpoints

**Версионирование API отсутствует.** Ни один путь не содержит `/v1/`, нет
заголовков версии, нет OpenAPI-спецификации. Это отдельный риск для
мобильного клиента (см. раздел 12).

### 5.1 HTTP route handlers (единственная часть, доступная не-браузеру)

| # | Метод | Путь | Файл | Auth | Роль | Назначение | Пригоден мобильному |
|---|---|---|---|---|---|---|---|
| 1 | POST | `/api/assistant/client` | `app/api/assistant/client/route.ts:58` | опционально (cookie) | guest / client | ИИ-помощник, 3 уровня | **Да, с оговоркой** — тир определяется из cookie-сессии |
| 2 | POST | `/api/assistant/staff` | `app/api/assistant/staff/route.ts:15` | обязательно (cookie) | `support`/`admin` | ИИ команды + вложения | Только для admin-приложения |
| 3 | GET | `/api/messages/thread` | `app/api/messages/thread/route.ts:12` | обязательно (cookie) | client / staff | Лента чата кейса | **Да, с оговоркой** |
| 4 | POST | `/api/messages/audio` | `app/api/messages/audio/route.ts:26` | обязательно (cookie) | client / staff | Голосовое сообщение (multipart) | **Да, с оговоркой** |
| 5 | POST | `/api/stripe/webhook` | `app/api/stripe/webhook/route.ts:29` | подпись Stripe | — | Приём событий оплаты | Нет (server-to-server) |
| 6 | GET | `/auth/callback` | `app/auth/callback/route.ts:12` | код из письма | любой | Обмен кода на сессию + редирект | Нет (браузерный редирект) |
| 7 | GET | `/admin/documents/[documentId]/view` | `app/(admin)/admin/documents/[documentId]/view/route.ts:12` | обязательно (cookie) | `support`/`admin` | 302 на signed URL документа | Нет (редирект, admin-only) |

«С оговоркой» означает: эндпоинт возвращает и принимает JSON/multipart, но
авторизуется **исключительно через cookie Supabase** (`sb-*`), а не через
заголовок `Authorization: Bearer`. Это подтверждено тем, что все три
клиентских эндпоинта вызывают `createSupabaseServerClient()`
(`lib/supabase/server.ts:5`), который читает сессию из `cookies()`
(`lib/supabase/server.ts:12`). Мобильный клиент обязан либо вручную
подставлять cookie, либо на backend должна быть добавлена поддержка
Bearer-токена — см. блокер MB-01.

### 5.2 Server Actions — НЕ API, но именно здесь живёт запись данных

20 действий, помеченных `"use server"`. Мобильный клиент вызвать их не может.

| # | Действие | Файл:строка | Что делает | Роль |
|---|---|---|---|---|
| 1 | `signInWithPassword` | `lib/auth/actions.ts:45` | Вход | гость |
| 2 | `signUpWithPassword` | `lib/auth/actions.ts:89` | Регистрация + привязка реферала | гость |
| 3 | `requestPasswordReset` | `lib/auth/actions.ts:143` | Письмо восстановления | гость |
| 4 | `updatePassword` | `lib/auth/actions.ts:187` | Новый пароль | recovery-сессия |
| 5 | `logoutAction` | `lib/auth/actions.ts:233` | Выход | любой |
| 6 | `submitOnboarding` | `lib/onboarding/actions.ts:31` | **Создание кейса + согласия + аудит** | client |
| 7 | `recordUploadedDocumentMetadata` | `lib/documents/actions.ts:37` | **Регистрация загруженного документа** | client |
| 8 | `sendClientCaseMessage` | `lib/messages/actions.ts:16` | **Текст в чат кейса** | client |
| 9 | `sendStaffCaseMessage` | `lib/messages/actions.ts:86` | Текст от команды | staff |
| 10 | `createSupportRequest` | `lib/support/actions.ts:32` | Обращение из кабинета | client |
| 11 | `submitPublicSupportRequest` | `lib/support/public-actions.ts:45` | Обращение без аккаунта | гость |
| 12 | `updateSupportRequestStatus` | `lib/support/actions.ts:134` | Смена статуса обращения | staff |
| 13 | `recordPaymentOfferAcceptance` | `lib/payments/actions.ts:15` | Согласие с офертой при оплате | client |
| 14 | `submitAltPaymentRequest` | `lib/payments/alt-request-action.ts:43` | Заявка на альт. оплату | любой |
| 15 | `announcePaypalIntent` | `lib/payments/paypal-intent.ts:13` | Сигнал команде о PayPal | любой |
| 16 | `redeemTokens` | `lib/tokens/actions.ts:25` | **Токены → промокод Stripe** | client |
| 17 | `updateCaseState` | `lib/cases/staff-actions.ts:28` | Статус/срочность/направление кейса | staff |
| 18 | `recordCasePayment` | `lib/cases/staff-actions.ts:125` | Ручная запись оплаты | staff |
| 19 | `acknowledgeEscalation` | `lib/escalations/actions.ts:9` | Принятие красного флага | staff |
| 20 | `addKnowledgeEntry` / `setKnowledgeEntryActive` | `lib/assistant/actions.ts:19,67` | База знаний ИИ | staff |
| 21 | `discoverTelegramChats` / `sendTestNotification` | `lib/notifications/test-action.ts:45,131` | Настройка Telegram | founder |

Из них **7 действий критичны для клиентского мобильного MVP**: №2, 3, 4, 6,
7, 8, 10.

---

## 6. Таблица механизмов авторизации

| Механизм | Реализация | Файл:строка | Мобильная пригодность |
|---|---|---|---|
| Провайдер идентичности | Supabase Auth, email + пароль | `lib/auth/actions.ts:61,109` | **Пригоден напрямую** — мобильный Supabase SDK поддерживает тот же метод |
| Хранение сессии в вебе | HTTP-cookie `sb-*`, ставит `@supabase/ssr` | `lib/supabase/server.ts:14-36`, `middleware.ts:42` | **Не пригоден** — на мобильном нет cookie-jar; нужен Bearer/secure storage |
| Обновление сессии | Middleware вызывает `supabase.auth.getUser()` на каждом не-статическом запросе | `middleware.ts:74` | Не нужен — мобильный SDK обновляет токен сам |
| Проверка клиента (страницы) | `getRequiredUser()` → редирект на `/login?next=` | `lib/auth/require-user.ts:16,34` | **Не пригоден** — редирект вместо 401 |
| Проверка персонала | `getStaffUserState()` → роль из `profiles.role` | `lib/auth/require-staff.ts:33,52-79` | Логика переносима, механизм — нет |
| Проверка основателя | `getFounderState()` → роль `admin` + allowlist `FOUNDER_EMAILS` | `lib/auth/require-founder.ts:6,17-29` | Логика переносима |
| Серверный доступ в обход RLS | service-role ключ, singleton, только Node | `lib/supabase/service.ts:6-10,17-35` | **Категорически запрещён в приложении** |
| Публичный клиент | anon-ключ, браузерный клиент | `lib/supabase/client.ts:7-15` | **Пригоден** — anon-ключ публичен по дизайну |
| OAuth / соцвход | **отсутствует** | — | Требует продуктового решения |
| Биометрия / PIN | **отсутствует** | — | Требует продуктового решения |
| MFA | **отсутствует** | — | См. открытые вопросы |
| Подтверждение email | Через `emailRedirectTo` на `/auth/callback` | `lib/auth/actions.ts:113`, `app/auth/callback/route.ts:24` | **Требует deep link** — сейчас ведёт на веб-URL |

### Access tokens, refresh tokens, cookies и сессии — фактическое состояние

Явной работы с access/refresh-токенами в коде платформы **нет**: они целиком
инкапсулированы в `@supabase/ssr`, который сериализует их в cookie с
префиксом `sb-`. Подтверждение — `middleware.ts:40-46`, где наличие сессии
определяется именно по префиксу имени cookie.

Cookies, которые платформа ставит явно:

| Cookie | Назначение | Срок | Файл:строка |
|---|---|---|---|
| `sb-*` | Сессия Supabase Auth (access + refresh) | управляется Supabase | `lib/supabase/server.ts:27`, `middleware.ts:66` |
| `pm-ref` | Реферальный код из `?ref=`, first-touch wins | 90 дней, `sameSite: lax` | `middleware.ts:5-6,22-26` |
| `pm-locale` | Язык интерфейса RU/EN | 1 год | `lib/i18n/locale.ts:5`, `components/LanguageSwitcher.tsx:10` |

Ни `HttpOnly`, ни `Secure` для `pm-ref` явно не выставлены в коде
(`middleware.ts:22-26`) — это не секретные значения, но факт зафиксирован.

`localStorage` используется **ровно в одном месте** и только для UI-флага
«приветствие ИИ уже показано» (`components/assistant/AssistantWidget.tsx:39,57`).
Никаких токенов, персональных или медицинских данных в браузерном хранилище
платформа не держит.

---

## 7. Таблица ролей и разрешений

Роли — enum `public.actor_role`
(`supabase/migrations/20260621220000_create_core_schema.sql:7-14`):
`client`, `karen`, `support`, `admin`, `ai`, `system`.

Статусы профиля — enum `public.profile_status` (там же, строки 16-21):
`registered`, `active`, `suspended`, `closed`.

| Роль | Как назначается | Доступ в вебе | Доступ к данным | Пригодность для мобильного |
|---|---|---|---|---|
| `client` | По умолчанию при вставке профиля; триггер принудительно ставит `client`/`active` | `/cabinet/*`, `/onboarding`, `/payment` | Только свои строки через RLS `auth.uid()` | **Целевая роль мобильного MVP** |
| `support` | Только вручную/сервером — клиент изменить не может | `/admin`, `/admin/cases`, `/admin/documents`, `/admin/requests` | Через service-role, в обход RLS | Отдельное admin-приложение, не MVP |
| `admin` | То же | Всё, что `support`, плюс `/admin/founder` при прохождении allowlist | Через service-role | Отдельное admin-приложение, не MVP |
| `karen` | Присутствует в enum; используется как `sender_role` в чате | Не даёт доступа к `/admin` — `isStaffRole()` принимает только `support`/`admin` | — | **Расхождение**, см. раздел 14 |
| `ai` | Системная роль в аудите/lifecycle | — | — | Неприменимо |
| `system` | Значение по умолчанию для `actor_role` в аудите | — | — | Неприменимо |

Ключевые защиты ролей (подтверждено):

- Клиент не может выставить себе `role` или `status` — триггер
  `protect_profile_staff_fields_from_client` перезаписывает эти поля при
  INSERT и UPDATE
  (`supabase/migrations/20260623040000_staff_access_profile_role_hardening.sql:12-28`).
- Заблокированный/закрытый профиль теряет доступ к `/admin` даже с ролью
  `support`/`admin` (`lib/auth/require-staff.ts:65-72`).
- Клиент не может менять статус, владельца, кейс, путь или архивность
  своего документа — триггер `prevent_uploaded_document_client_tampering`
  (`supabase/migrations/20260709120000_launch_hardening.sql:15-60`).
- `admin_notes` полностью закрыт от клиента: политика `using (false)`
  (`supabase/migrations/20260621220000_create_core_schema.sql:584-587`).

---

## 8. Карта потоков данных

### 8.1 Регистрация и создание кейса

```
Клиент → signUpWithPassword (Server Action)
       → Supabase Auth signUp (emailRedirectTo=/auth/callback)
       → attachReferral(cookie pm-ref)               [best-effort]
       → письмо на email → /auth/callback?code=...
       → exchangeCodeForSession → cookie sb-*
       → /onboarding → submitOnboarding (Server Action)
          ├─ upsert profiles (full_name, phone, status=active)
          ├─ insert client_cases (status=ready_for_review)
          ├─ insert onboarding_submissions (payload jsonb)
          ├─ insert consent_records ×2 (offer_acceptance, data_processing)
          ├─ writeAuditLogs ×3-4
          └─ writeLifecycleEvents ×2-3
       → redirect /cabinet?onboarding=submitted
```
Источник: `lib/auth/actions.ts:89-139`, `lib/onboarding/actions.ts:31-310`.

### 8.2 Загрузка документа (гибридный поток — важен для мобильного)

```
Браузер: валидация файла локально (lib/documents/config.ts:75)
       → генерация documentId = crypto.randomUUID()
       → путь {userId}/{caseId}/{documentId}/{safeFilename}
       → ПРЯМАЯ загрузка в Storage bucket "client-documents"
         (anon key + сессия пользователя, RLS Storage по auth.uid())
       → Server Action recordUploadedDocumentMetadata
          ├─ перепроверяет путь на сервере
          ├─ проверяет, что кейс принадлежит пользователю
          ├─ проверяет, что объект реально есть в Storage
          ├─ insert uploaded_documents
          └─ writeAuditLog
       → при ошибке метаданных браузер удаляет уже загруженный объект
```
Источник: `app/(client)/cabinet/DocumentUploadPanel.tsx:110-205`,
`lib/documents/actions.ts:37-158`.

**Первая половина потока (загрузка в Storage) полностью переносима на
мобильный.** Вторая половина (регистрация метаданных) — Server Action,
блокер MB-02.

### 8.3 Чат по кейсу

```
Чтение:   GET /api/messages/thread[?caseId=] каждые 3 с, пока вкладка видима
          → service-role читает case_messages (лимит 200)
          → подписывает URL голосовых на 1 час
          → markThreadRead() помечает встречные сообщения прочитанными
Текст:    Server Action sendClientCaseMessage
          → service-role insert case_messages
          → notifyTeam() → Telegram
Голос:    POST /api/messages/audio (multipart, ≤10 МБ)
          → service-role upload в bucket "case-audio"
          → insert case_messages (audio_path, duration)
          → при провале insert — откат: файл удаляется
          → notifyTeam() → Telegram
```
Источник: `app/api/messages/thread/route.ts:12-69`,
`lib/messages/queries.ts:102-139`, `lib/messages/actions.ts:16-83`,
`app/api/messages/audio/route.ts:26-173`.

### 8.4 Оплата

```
Клиент → /payment → чекбокс оферты (обязателен)
       → recordPaymentOfferAcceptance (Server Action, best-effort)
       → ВНЕШНИЙ переход на Stripe Payment Link (уход с платформы)
       → Stripe → POST /api/stripe/webhook (подпись проверяется)
          ├─ insert stripe_events (идемпотентность по event.id)
          ├─ определение клиента: client_reference_id → или email (ilike)
          ├─ определение тарифа по сумме (productFromAmount)
          ├─ insert payments (уникальный processor_reference)
          ├─ insert service_periods (status=active)
          ├─ awardReferralTokensForPayment()
          └─ notifyTeam() → Telegram
       → несовпадение клиента/суммы → громкий алерт на ручную привязку
```
Источник: `app/api/stripe/webhook/route.ts:29-348`,
`lib/payments/actions.ts:15-64`.

**Оплата в вебе происходит вне платформы** (внешний Stripe Payment Link).
Для мобильного это пересекается с правилами магазинов приложений —
см. блокер MB-06.

### 8.5 ИИ-помощник и красные флаги

```
Клиент → POST /api/assistant/client {messages, locale}
       → лимит по IP (40/мин, per-instance)
       → resolveAssistantAudience(): по cookie определяется тир
          guest | registered | client  (client = есть оплата со status=paid)
       → лимит по тиру (8 / 20 / 30 в минуту)
       → guardAssistantRequest(): суточные лимиты через RPC bump_assistant_usage
          (IP хэшируется с солью, сырой IP не хранится)
       → сборка system prompt по тиру (для client — контекст кейса)
       → askAssistantTeam(): claude | best (2 модели + арбитр)
       → extractRedFlag(): скрытый маркер [RED_FLAG:...] вырезается из ответа
       → при флаге: insert escalation_events + notifyTeam() → Telegram
       → клиенту возвращается {reply}
```
Источник: `app/api/assistant/client/route.ts:58-202`,
`lib/assistant/tiers.ts:84-236`, `lib/assistant/guard.ts:105-174`,
`lib/assistant/red-flags.ts:12-116`, `lib/assistant/router.ts:95-190`.

**Критично:** содержимое загруженных документов ИИ **не читает**. В контекст
попадают только имена файлов, и промпт прямо это фиксирует: «Содержимое
файлов тебе НЕ доступно — только названия» (`lib/assistant/tiers.ts:203`).

### 8.6 Куда данные покидают платформу

| Направление | Что уходит | Файл |
|---|---|---|
| Anthropic API | Текст диалога + system prompt (для персонала — вложения) | `lib/assistant/claude.ts` |
| OpenAI API | То же, кроме вложений | `lib/assistant/openai.ts` |
| Telegram Bot API | Заголовки событий, email клиента, id кейса, **усечённый фрагмент сообщения** при красном флаге | `lib/notifications/telegram.ts:28`, `lib/assistant/red-flags.ts:109` |
| Stripe | Сумма, email плательщика, `client_reference_id` | внешний Payment Link |
| Supabase | Все данные платформы | — |

---

## 9. Reusable backend capabilities

То, что мобильное приложение может переиспользовать **без изменения
backend**:

| # | Возможность | Как переиспользовать | Подтверждение |
|---|---|---|---|
| R-01 | Аутентификация email + пароль | Мобильный Supabase SDK → `signInWithPassword` напрямую к Supabase Auth | `lib/auth/actions.ts:61` использует ровно этот метод |
| R-02 | Обновление токена | Встроено в мобильный Supabase SDK | `middleware.ts:74` — веб делает то же самое |
| R-03 | Чтение своего профиля | `select` из `profiles` под RLS | политика `profiles_select_own`, миграция строка 465 |
| R-04 | Чтение своего кейса | `select` из `client_cases` | `client_cases_select_own`, строка 481 |
| R-05 | Чтение истории кейса | `select` из `case_lifecycle_events` | `case_lifecycle_events_select_own`, строка 538 |
| R-06 | Чтение своих оплат | `select` из `payments` | `payments_select_own`, строка 523 |
| R-07 | Чтение периодов сопровождения | `select` из `service_periods` | `service_periods_select_own`, строка 533 |
| R-08 | Чтение метаданных своих документов | `select` из `uploaded_documents` | `uploaded_documents_select_own`, строка 507 |
| R-09 | Чтение своих обращений | `select` из `support_requests` | `support_requests_select_own`, строка 543 |
| R-10 | Чтение своих согласий | `select` из `consent_records` | `consent_records_select_own`, строка 574 |
| R-11 | Чтение ленты чата | `select` из `case_messages` | `case_messages_select_own`, `20260722150000_case_messages_voice.sql:32` |
| R-12 | Чтение своих рефералов | `select` из `referrals` | `referrals_select_own`, `20260725120000_referrals.sql:45` |
| R-13 | Чтение своих токенов | `select` из `token_transactions` | `token_transactions_select_own`, `20260725140000_referral_tokens.sql:36` |
| R-14 | Загрузка файла в Storage | Прямой upload в `client-documents` по пути `{uid}/{caseId}/{docId}/{file}` | `DocumentUploadPanel.tsx:157`, `supabase/storage_manual_setup.md:71-91` |
| R-15 | Signed URL своего документа | `createSignedUrl(path, 60)` под сессией пользователя | `DocumentUploadPanel.tsx:93-95` |
| R-16 | ИИ-помощник (HTTP) | POST на существующий эндпоинт | `app/api/assistant/client/route.ts:58` |
| R-17 | Лента чата (HTTP) | GET на существующий эндпоинт | `app/api/messages/thread/route.ts:12` |
| R-18 | Голосовое сообщение (HTTP multipart) | POST на существующий эндпоинт | `app/api/messages/audio/route.ts:26` |
| R-19 | Вся серверная бизнес-логика Stripe | Webhook работает независимо от клиента | `app/api/stripe/webhook/route.ts:29` |
| R-20 | Уведомления команде (Telegram) | Срабатывают автоматически при записи данных | `lib/notifications/notify.ts:35` |
| R-21 | Аудит и lifecycle-события | Пишутся серверной логикой | `lib/audit/log.ts`, `lib/cases/lifecycle.ts` |
| R-22 | Защита ИИ от наплыва | Суточные лимиты общие для всех клиентов | `lib/assistant/guard.ts:105` |

R-03 … R-15 — это **13 возможностей, работающих сегодня без единой строки
изменений на backend**, при условии что мобильный клиент авторизуется
собственным Supabase SDK.

---

## 10. Web-only зависимости

Места, где реализация привязана к браузеру и не переносится на мобильный
клиент как есть.

| # | Зависимость | Где | Последствие для мобильного |
|---|---|---|---|
| W-01 | **Server Actions** как транспорт записи | 20 действий, `lib/*/actions.ts` | Недоступны нативному клиенту. Главная web-only зависимость |
| W-02 | **Cookie-сессия** вместо Bearer | `lib/supabase/server.ts:12-36`, `middleware.ts:40-46` | Существующие API-эндпоинты не примут заголовок `Authorization` |
| W-03 | **Server-side rendering** всех экранов | `app/(client)/cabinet/*/page.tsx` (`dynamic = "force-dynamic"`) | Экраны отдаются как HTML, не как данные. Мобильному нужен JSON |
| W-04 | **`redirect()` вместо 401/403** | `lib/auth/require-user.ts:34`, `lib/auth/require-staff.ts:88` | Мобильный получит 3xx/HTML вместо кода ошибки |
| W-05 | **URL-маршрутизация и `?next=`** | `lib/auth/actions.ts:25-33,70-86` | Логика «куда вести после входа» завязана на web-пути |
| W-06 | **Cookie `pm-locale`** для языка | `lib/i18n/locale.ts:11-16`, `components/LanguageSwitcher.tsx:10` | Мобильному нужен свой механизм локали |
| W-07 | **Cookie `pm-ref`** для рефералов | `middleware.ts:10-27` | Реферальная атрибуция мобильного требует другого механизма (deep link / отложенная атрибуция) |
| W-08 | **`window.location.reload()`** при смене языка | `components/LanguageSwitcher.tsx:11` | Неприменимо |
| W-09 | **`window.open` для документа** | `app/(client)/cabinet/DocumentUploadPanel.tsx:91-107` | Нужен native viewer / in-app browser |
| W-10 | **`localStorage`** для флага приветствия ИИ | `components/assistant/AssistantWidget.tsx:39,57` | Тривиально заменяется, но зафиксировано |
| W-11 | **Web Speech API** (`SpeechRecognition`) для голосового ввода в ИИ | `components/assistant/useVoiceInput.ts:29-39,77` | Нет на мобильном; нужен нативный STT |
| W-12 | **`MediaRecorder` + `getUserMedia`** для голосовых | `components/messages/VoiceRecorder.tsx:14,51,67-71` | Нужна нативная запись; форматы: webm/mp4/mpeg/ogg/wav (`app/api/messages/audio/route.ts:13-19`) |
| W-13 | **Canvas + `FileReader`** для сжатия фото перед ИИ | `lib/assistant/prepare-files.ts:41,58` | Нужна нативная обработка изображений |
| W-14 | **`document.visibilityState` / `window.focus`** для polling | `components/messages/CaseMessageThread.tsx:125-142` | Нужен нативный жизненный цикл приложения |
| W-15 | **`document.body.style.overflow`** для модалки | `components/messages/CaseMessageThread.tsx:152-156` | Неприменимо |
| W-16 | **`navigator.clipboard`** | `components/referrals/ReferralPanel.tsx:24`, `TokenPanel.tsx:51`, `TelegramSetupPanel.tsx:39` | Заменяется нативным API |
| W-17 | **Email-редиректы на веб-домен** | `lib/auth/actions.ts:35-43,167` | Письма подтверждения/восстановления ведут в браузер, а не в приложение |
| W-18 | **`revalidatePath()`** для обновления UI | `lib/messages/actions.ts:80`, `lib/support/actions.ts:126`, `lib/tokens/actions.ts:111` и др. | Кэш-механика Next.js; мобильному нужен свой инвалидатор |
| W-19 | **Внешние Payment Links** открываются в браузере | `lib/payments/config.ts:72-86` | Правила App Store / Google Play |
| W-20 | **`/legal/offer` как PDF-страница** | `app/(public)/legal/offer/page.tsx`, `public/legal/python-method-oferta-v2.pdf` | Нужен нативный PDF-просмотр |

---

## 11. Mobile blockers

Отсортировано по критичности. «Блокер» = без решения этого пункта
соответствующая функция в мобильном приложении не заработает.

| ID | Блокер | Подтверждение | Затронутые функции | Обходной путь без изменения backend |
|---|---|---|---|---|
| **MB-01** | **Нет API-аутентификации по Bearer-токену.** Все клиентские эндпоинты читают сессию только из cookie | `lib/supabase/server.ts:12`, `app/api/messages/thread/route.ts:36` | Все 4 HTTP-эндпоинта | Частично: вручную подставлять cookie `sb-*` в запросы. Хрупко и не рекомендуется |
| **MB-02** | **Запись данных доступна только через Server Actions** — 7 клиентских действий не имеют HTTP-аналога | раздел 5.2 | Анкета, регистрация документа, сообщение в чат, обращение, погашение токенов | **Нет.** Требует новых route handlers |
| **MB-03** | **Нет push-инфраструктуры.** Ни FCM, ни APNs, ни таблицы токенов устройств, ни web-push | grep по репозиторию: совпадений нет | Уведомления о сообщении команды, о смене статуса, о красном флаге | **Нет.** Уведомления сегодня уходят только команде в Telegram (`lib/notifications/notify.ts:35`) |
| **MB-04** | **Нет realtime.** Чат работает polling'ом раз в 3 с; Supabase Realtime не подключён | `components/messages/CaseMessageThread.tsx:19`; grep `realtime`/`channel(` — 0 совпадений | Живой чат | Polling работает и на мобильном, но дорог по батарее и трафику |
| **MB-05** | **Нет версионирования API.** Ни `/v1/`, ни заголовков версии, ни OpenAPI | все пути в `app/api/` | Все | **Нет.** Любое изменение эндпоинта сломает выпущенные версии приложения |
| **MB-06** | **Оплата уходит на внешний Stripe Payment Link** | `lib/payments/config.ts:72-86`, `components/payments/PaymentPlans.tsx` | Покупка сопровождения | Требует продуктового и юридического решения по правилам магазинов |
| **MB-07** | **Deep links не настроены.** Подтверждение email и восстановление пароля ведут на `{origin}/auth/callback` | `lib/auth/actions.ts:35-43,167` | Регистрация, восстановление пароля | **Нет.** Требует Universal Links / App Links + изменения `emailRedirectTo` |
| **MB-08** | **Ошибки возвращаются как редиректы и как русскоязычные строки**, а не как коды | `lib/auth/require-user.ts:34`; `NextResponse.json({error: "Некорректный запрос."})` в каждом route handler | Вся обработка ошибок | Парсинг строк — недопустимо хрупко |
| **MB-09** | **Тир ИИ-помощника определяется из cookie-сессии на сервере** | `lib/assistant/tiers.ts:84-110` | ИИ-помощник | Без cookie мобильный клиент всегда получит уровень `guest` |
| **MB-10** | **Rate limiting частично per-instance**, память процесса | `app/api/assistant/client/route.ts:37-38`; комментарий на строках 35-36 | ИИ, публичная поддержка | Не блокирует, но мобильные ретраи могут вести себя непредсказуемо |
| **MB-11** | **`insert` в `client_cases` и `onboarding_submissions` разрешён RLS, но вся сопутствующая логика (согласия, аудит, lifecycle) — в Server Action** | `lib/onboarding/actions.ts:117-307` | Анкета | Прямая вставка через SDK создаст кейс **без согласий и без аудита** — недопустимо |
| **MB-12** | **`case_messages` для клиента — только чтение**, вставка идёт service-role | политика `case_messages_select_own` (только SELECT), `lib/messages/actions.ts:51-61` | Отправка текста в чат | **Нет** |
| **MB-13** | **Голосовые форматы браузерные.** Разрешены webm/mp4/mpeg/ogg/wav | `app/api/messages/audio/route.ts:13-19` | Голосовые сообщения | iOS пишет m4a (`audio/mp4`) — **входит в список**, работает. Android webm/ogg — тоже. Блокер низкой критичности |
| **MB-14** | **Нет механизма минимальной поддерживаемой версии приложения** (force update) | отсутствует | Все | **Нет.** Требует нового эндпоинта |
| **MB-15** | **Админ-панель полностью server-rendered и русскоязычная**, без API | `app/(admin)/**` | Мобильная админка | Мобильная админка вне досягаемости без отдельного API-слоя |

---

## 12. Security risks

Оценка сделана **в контексте появления мобильного клиента**. Это не аудит
безопасности текущего веба.

| ID | Риск | Уровень | Подтверждение | Что это значит для мобильного |
|---|---|---|---|---|
| **SR-01** | Попадание `SUPABASE_SERVICE_ROLE_KEY` в мобильное приложение | **Критический** | Ключ даёт полный обход RLS: `lib/supabase/service.ts:27-32` | **Абсолютный запрет.** Любой мобильный бандл реверсится. Зафиксировано в `MOBILE_SECURITY_BOUNDARY_V1.md` |
| **SR-02** | Локальное кэширование медицинских документов на устройстве | **Критический** | Документы приватны, доступ только по 60-секундному signed URL: `DocumentUploadPanel.tsx:95` | Signed URL и файлы не должны переживать сессию; см. правила хранения |
| **SR-03** | Попадание PHI в логи мобильного приложения / крэш-репорты | **Высокий** | Платформа усечает фрагменты даже в Telegram (600 символов, `lib/assistant/red-flags.ts:69`) | Мобильный обязан соблюдать не менее строгие правила |
| **SR-04** | Ручная подстановка cookie `sb-*` как обход MB-01 | **Высокий** | `middleware.ts:40-46` | Ведёт к хранению сессии вне защищённого хранилища ОС |
| **SR-05** | Отсутствие MFA и биометрии | **Средний** | В коде нет | Устройство с медицинскими данными защищено только паролем |
| **SR-06** | Привязка оплаты гостя по email через `ilike` | **Средний** | `app/api/stripe/webhook/route.ts:168-175` | Совпадение email открывает доступ к оплаченному тарифу. Веб-риск, но мобильный его наследует |
| **SR-07** | Отсутствие ротации/отзыва сессий на устройствах | **Средний** | Механизма нет | Потеря телефона = нет способа отозвать сессию |
| **SR-08** | Signed URL голосовых живут 1 час | **Средний** | `lib/messages/queries.ts:4` (`SIGNED_URL_TTL_SECONDS = 3600`) | Кэш URL на устройстве живёт дольше, чем нужно |
| **SR-09** | Отсутствие certificate pinning | **Низкий/Средний** | Не применимо к вебу | Решение для мобильного |
| **SR-10** | Сообщения об ошибках раскрывают внутренности БД | **Низкий** | `errorState(error.message)` из Supabase в UI, напр. `lib/documents/actions.ts:88` | Мобильный не должен показывать сырые сообщения БД |
| **SR-11** | `pm-ref` cookie без `HttpOnly`/`Secure` в коде | **Низкий** | `middleware.ts:22-26` | Не секрет, но мобильный аналог не должен быть хуже |
| **SR-12** | Отсутствие jailbreak/root-детекции | **Низкий** | — | Продуктовое решение |
| **SR-13** | ИИ-диалоги не сохраняются | **Информационный** | Подтверждено в `README.md:70` | Плюс для приватности, минус для непрерывности на мобильном |
| **SR-14** | Вложения ИИ команды не хранятся нигде | **Информационный (позитивный)** | `lib/assistant/attachments.ts:3-6` | Хорошая практика, которую мобильному стоит повторить |

### Отдельно: обработка чувствительных данных — что платформа делает правильно

Эти механизмы **обязательны к сохранению** в мобильном клиенте:

- Бакет `client-documents` приватный, публичные URL запрещены
  (`supabase/storage_manual_setup.md:12,148`).
- Storage RLS требует, чтобы первый сегмент пути равнялся `auth.uid()`
  (`supabase/storage_manual_setup.md:66-69`).
- Сырые IP-адреса не хранятся — только соль + SHA-256
  (`lib/assistant/guard.ts:60-64`,
  `supabase/migrations/20260728120000_assistant_usage.sql:12-14`).
- Согласия фиксируются явно, с версией оферты
  (`lib/onboarding/actions.ts:170-197`).
- Пароль восстановления не раскрывает существование аккаунта
  (`lib/auth/actions.ts:171-182`).
- Красный флаг уходит команде усечённым фрагментом, а не полным текстом
  (`lib/assistant/red-flags.ts:109`).
- `admin_notes` недоступны клиенту на уровне БД (миграция, строка 584).

---

## 13. Тестовая инфраструктура, логирование, мониторинг, окружения

### 13.1 Тесты

12 файлов Vitest в `tests/`, конфиг `vitest.config.ts`. Покрывают
**исключительно чистые функции**: валидация паролей и email
(`auth-validation.test.ts`), валидация обращений
(`support-validation.test.ts`), маппинг сумм Stripe на продукты
(`stripe-product-mapping.test.ts`), токены (`tokens.test.ts`), реферальные
коды (`referral-code.test.ts`), лимиты ИИ (`assistant-guard.test.ts`),
вложения и батчинг (`assistant-attachments.test.ts`,
`assistant-batching.test.ts`), формат уведомлений
(`notifications-format.test.ts`), альтернативные платежи
(`alt-payment-validation.test.ts`), тестовый продукт
(`test-access-product.test.ts`), метки основателя
(`founder-labels.test.ts`).

**Чего нет:** интеграционных тестов, тестов route handlers, тестов Server
Actions, E2E, контрактных тестов API, тестов RLS. Для мобильного это
означает: **контракта, защищённого тестами, не существует** — изменение
эндпоинта не будет поймано CI.

Команды (`package.json:10-12`): `npm run typecheck`, `npm test`,
`npm run lint`, `npm run build`.

### 13.2 Логирование и мониторинг

| Механизм | Реализация | Файл |
|---|---|---|
| Аудит действий | Таблица `audit_logs`, пишется серверной логикой | `lib/audit/log.ts`, миграция строка 332 |
| События жизненного цикла кейса | Таблица `case_lifecycle_events` | `lib/cases/lifecycle.ts`, миграция строка 281 |
| Журнал доставки уведомлений | Таблица `notification_events` со статусами `pending/sent/failed/skipped`, счётчиком попыток и dedupe-ключом | `lib/notifications/notify.ts:52-89`, `20260723120000_launch_closure_sprint.sql:6-24` |
| Идемпотентность Stripe | Таблица `stripe_events` (insert-first) | `20260723120000_launch_closure_sprint.sql:27-35` |
| Технические ошибки | `console.error` в двух местах | `lib/notifications/notify.ts:68,93` |
| Алерты команде | Telegram, `kind: "processing_error"` | `lib/notifications/notify.ts:35` |
| UI-граница ошибок | `app/error.tsx`, `components/ErrorIsland.tsx` | — |

**APM/мониторинга нет:** Sentry, Datadog, OpenTelemetry, structured logging,
health-check эндпоинта, метрик — не обнаружено. Наблюдаемость платформы =
таблицы аудита + Telegram + логи Vercel.

Для мобильного это значит: **серверной стороны для диагностики мобильных
проблем сейчас нет.**

### 13.3 Окружения

Явного разделения окружений в коде **нет**: ни `NODE_ENV`-ветвлений в
бизнес-логике, ни файлов `.env.staging`/`.env.production`, ни конфигурации
разных Supabase-проектов. Из `docs/deployment.md:94-110` следует модель:

- **development** — локально, `npm run dev`, `.env.local` (в `.gitignore`)
- **preview** — Vercel preview-деплой (`docs/deployment.md:60-64`)
- **production** — Vercel + домен `pythonmethodcenter.com`
  (`docs/deployment.md:66-71`)

Формального staging-окружения в документации не описано. Feature flags
реализованы через **наличие/отсутствие переменных окружения**: тестовый
тариф исчезает, если убрать `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_TEST`
(`lib/payments/config.ts:42-50`); кнопки оплаты скрываются без ссылок
(`lib/payments/config.ts:30-38`); уведомления пропускаются без Telegram-ключей
(`lib/notifications/notify.ts:72-78`).

### 13.4 Переменные окружения (только имена — значения не читались и не выводятся)

Из `.env.example` и кода:

**Публичные (`NEXT_PUBLIC_*`, попадают в браузерный бандл — и попадут в
мобильный, если использовать те же):**
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_STRIPE_PAYMENT_LINK_5W`, `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_15W`,
`NEXT_PUBLIC_STRIPE_PAYMENT_LINK_TEST`, `NEXT_PUBLIC_PAYPAL_LINK_5W`,
`NEXT_PUBLIC_PAYPAL_LINK_15W`, `NEXT_PUBLIC_PAYPAL_LINK_TEST`,
`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_FREE_REVIEW` (упомянута в `README.md:11`).

**Серверные — НИ ОДНА не должна попасть в мобильное приложение:**
`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_CHAT_ID`, `ASSISTANT_USAGE_SALT`, `PUBLIC_ASSISTANT_MODE`,
`ASSISTANT_DAILY_LIMIT_GUEST`, `ASSISTANT_DAILY_LIMIT_REGISTERED`,
`ASSISTANT_DAILY_LIMIT_CLIENT`, `ASSISTANT_DAILY_TOTAL_GUEST`,
`PAYMENT_ALT_BANK`, `PAYMENT_ALT_CRYPTO`, `PAYMENT_ALT_PAYPAL`,
`PAYMENT_ALT_WISE`, `PAYMENT_ALT_OTHER`, `FOUNDER_EMAILS`
(используется в `lib/auth/require-founder.ts:17`, но **отсутствует в
`.env.example`** — расхождение, см. раздел 14).

Значения переменных в ходе аудита не читались и нигде не выводятся.

---

## 14. Неизвестное и неподтверждённое

Расхождения и пробелы, найденные в коде. Полный список вопросов, требующих
человеческого ответа, — в `MOBILE_DISCOVERY_OPEN_QUESTIONS_V1.md`.

### 14.1 Расхождения внутри репозитория

| # | Расхождение | Подтверждение |
|---|---|---|
| U-01 | Роль `karen` есть в enum и используется как `sender_role`, но **не даёт доступа к `/admin`**: `isStaffRole()` принимает только `support` и `admin` | миграция строка 7-14 против `lib/auth/require-staff.ts:29-31` |
| U-02 | `FOUNDER_EMAILS` используется в коде, но **отсутствует в `.env.example`** | `lib/auth/require-founder.ts:17` против `.env.example` |
| U-03 | `docs/deployment.md:13` prohibits «adding AI logic», однако AI-runtime реализован. Документ устарел относительно кода | `docs/deployment.md:12-13` против `app/api/assistant/*` |
| U-04 | `PROJECT_RESET_STATUS.md` утверждает «No business logic», «database NOT COMPLETED». Файл устарел | `PROJECT_RESET_STATUS.md:13,21` против 14 миграций и `lib/` |
| U-05 | `docs/architecture/README.md` — заглушка «To be defined once the technology stack is selected», хотя стек выбран и реализован | `docs/architecture/README.md:3` |
| U-06 | Восемь директорий верхнего уровня (`backend/`, `ai/`, `database/`, `payments/`, `support/`, `web/`, `admin/`, `client-cabinet/`) содержат только README-заглушки | README-файлы в каждой |
| U-07 | В `storage_manual_setup.md:13` лимит бакета 52428800 байт (50 МБ), а валидация в коде — 25 МБ | `supabase/storage_manual_setup.md:13` против `lib/documents/config.ts:3` |
| U-08 | `storage_manual_setup.md:20` разрешает `text/plain`, код — нет | `supabase/storage_manual_setup.md:20` против `lib/documents/config.ts:5-10` |
| U-09 | Продукт `support_15_weeks` в БД, но в UI называется «100 дней» | миграция строка 71-75 против `lib/payments/config.ts:10` |
| U-10 | Бакет `case-audio` создаётся миграцией, но его RLS-политики в репозитории не описаны (в отличие от `client-documents`) | `20260722150000_case_messages_voice.sql:42-44`; нет аналога `storage_manual_setup.md` |
| U-11 | В `client_cases` есть ограничение «один активный кейс на профиль» (`client_cases_one_active_case_per_profile`), но столбец `archived_at` предполагает архивацию — как сосуществуют, из кода не следует | миграция строка 200,203 |
| U-12 | `document_type` в `uploaded_documents` всегда `"other"` — классификация не реализована | `lib/documents/actions.ts:117` |

### 14.2 Не подтверждается репозиторием (нельзя утверждать ни «есть», ни «нет»)

- Фактическое состояние production-Supabase: применены ли все 14 миграций,
  созданы ли Storage-политики (они создаются **вручную через Dashboard**,
  `supabase/storage_manual_setup.md:41`).
- Реальные значения любых переменных окружения в Vercel.
- Настроены ли Supabase Auth redirect URLs на production-домене.
- Включено ли подтверждение email в Supabase (код обрабатывает оба случая:
  `lib/auth/actions.ts:131-139`).
- Существует ли staging-окружение и отдельный Supabase-проект под него.
- Политики хранения и удаления в реальном проекте
  (`docs/architecture/DATA_RETENTION_AND_DELETION_POLICY_V1.md` не читался
  построчно как часть кода — это документ, а не реализация).
- Юрисдикция и применимый регуляторный режим для медицинских данных.

---

## 15. Итоговый вывод

# READY WITH GAPS

### Что это означает

Мобильную разработку **можно начинать**, но не с полного паритета функций.
Платформа даёт крепкий фундамент — Supabase Auth со стандартными JWT,
корректный RLS на всех 19 таблицах, приватное файловое хранилище с
path-based изоляцией, работающая серверная логика оплат и уведомлений.
**Тринадцать возможностей чтения работают уже сегодня без единого изменения
backend** (R-03 … R-15).

Разрыв — в **записи данных и в доставке событий**. Он не архитектурный
дефект: платформа строилась как web-first, и Server Actions были для этого
разумным выбором. Но именно из-за них семь ключевых клиентских действий
(регистрация, восстановление пароля, анкета, регистрация документа,
сообщение в чат, обращение в поддержку, погашение токенов) не имеют
HTTP-контракта, который мог бы вызвать нативный клиент.

### Обоснование вердикта

**Почему не READY:**
- MB-01: нет Bearer-аутентификации на API.
- MB-02: 7 критичных клиентских действий доступны только через Server Actions.
- MB-03: push-инфраструктуры не существует ни в каком виде.
- MB-05: API не версионировано — выпущенное приложение нечем защитить от
  изменений сервера.
- MB-07: deep links не настроены, письма ведут в браузер.

**Почему не NOT READY:**
- Аутентификация — стандартный Supabase Auth, мобильный SDK работает с ней
  напрямую (R-01, R-02).
- RLS реально ограничивает доступ по `auth.uid()` на всех клиентских
  таблицах — данные защищены на уровне БД, а не только на уровне приложения.
- Загрузка файлов уже сейчас идёт напрямую в Storage из клиента — тот же
  путь работает на мобильном (R-14).
- Три HTTP-эндпоинта (ИИ, лента чата, голосовые) уже принимают и отдают
  JSON/multipart — им не хватает только способа авторизации.
- Модель данных зрелая: 19 таблиц, продуманные enum'ы, идемпотентность
  оплат, append-only ledger токенов, журнал доставки уведомлений.
- Серверная логика денег (Stripe webhook) полностью независима от клиента и
  будет работать для мобильного без изменений (R-19).

### Что должно быть решено до старта разработки

Не как рекомендация к немедленной реализации — код на этом этапе не
меняется, — а как список того, что требует **решения продукта и backend**:

1. Способ аутентификации мобильного клиента (MB-01) — единственный
   действительно блокирующий пункт.
2. HTTP-контракт для семи клиентских действий (MB-02).
3. Политика версионирования API (MB-05).
4. Решение по push (MB-03).
5. Решение по оплате в мобильном контексте (MB-06) — продуктовое и
   юридическое.
6. Deep links и `emailRedirectTo` (MB-07).

Функции, готовые к мобильной реализации без изменения backend, перечислены
в `MOBILE_FEATURE_INVENTORY_V1.md` в разделе MVP; полная карта готовности по
каждой функции — в `MOBILE_API_CAPABILITY_MATRIX_V1.md`.

---

## Приложение A. Список изученных файлов

Файлы, прочитанные построчно в ходе аудита:

**Конфигурация и корень:** `package.json`, `.env.example`, `README.md`,
`middleware.ts`, `next.config.mjs`, `PROJECT_RESET_STATUS.md`,
`docs/deployment.md`, `docs/architecture/README.md`.

**Маршруты и страницы:** `app/api/assistant/client/route.ts`,
`app/api/assistant/staff/route.ts`, `app/api/messages/thread/route.ts`,
`app/api/messages/audio/route.ts`, `app/api/stripe/webhook/route.ts`,
`app/auth/callback/route.ts`,
`app/(admin)/admin/documents/[documentId]/view/route.ts`,
`app/(client)/cabinet/page.tsx`, `app/(client)/cabinet/layout.tsx`,
`app/(client)/cabinet/account/page.tsx`, `app/(client)/cabinet/chat/page.tsx`,
`app/(client)/cabinet/DocumentUploadPanel.tsx`.

**Библиотека:** `lib/supabase/server.ts`, `lib/supabase/service.ts`,
`lib/supabase/client.ts`, `lib/supabase/env.ts`, `lib/auth/actions.ts`,
`lib/auth/require-user.ts`, `lib/auth/require-staff.ts`,
`lib/auth/require-founder.ts`, `lib/onboarding/actions.ts`,
`lib/documents/actions.ts`, `lib/documents/config.ts`,
`lib/messages/actions.ts`, `lib/messages/queries.ts`, `lib/cases/queries.ts`,
`lib/cases/staff-actions.ts`, `lib/payments/actions.ts`,
`lib/payments/config.ts`, `lib/support/actions.ts`,
`lib/support/public-actions.ts`, `lib/tokens/actions.ts`,
`lib/tokens/queries.ts`, `lib/assistant/tiers.ts`, `lib/assistant/guard.ts`,
`lib/assistant/router.ts`, `lib/assistant/red-flags.ts`,
`lib/assistant/attachments.ts`, `lib/assistant/claude.ts` (частично),
`lib/notifications/notify.ts`, `lib/notifications/telegram.ts`,
`lib/i18n/locale.ts`, `lib/routes.ts`.

**Компоненты:** `components/messages/CaseMessageThread.tsx`,
`components/assistant/AssistantChat.tsx` (частично).

**База данных:** `supabase/migrations/20260621220000_create_core_schema.sql`,
`20260623010000_storage_audit_safety_foundation.sql`,
`20260623030000_document_intake_queue_foundation.sql`,
`20260623040000_staff_access_profile_role_hardening.sql`,
`20260709120000_launch_hardening.sql`,
`20260718100000_assistant_knowledge.sql`,
`20260722150000_case_messages_voice.sql`,
`20260723120000_launch_closure_sprint.sql`,
`20260725120000_referrals.sql`, `20260725140000_referral_tokens.sql`,
`20260728120000_assistant_usage.sql`, `supabase/storage_manual_setup.md`.

**Структурный анализ (grep/ls, без построчного чтения):** все файлы
`"use server"` и `"use client"`, `tests/`, `public/`, восемь
директорий-заглушек верхнего уровня, поиск по браузерным API, поиск по
push/email/SMS/realtime инфраструктуре.

---

## Приложение B. Read-only проверки

| Проверка | Результат |
|---|---|
| `git ls-files \| wc -l` | 271 отслеживаемых файла |
| `git status --short` | чистое рабочее дерево на момент начала аудита |
| Node.js в окружении | v22.22.2 (требование проекта — ≥ 20, `README.md:88`) |
| `node_modules` | **отсутствует** |
| `npm run typecheck` | **не выполнялся** — требует установки зависимостей, что запрещено условиями задачи |
| `npm test` | **не выполнялся** — по той же причине |
| `npm run build` | **не выполнялся** — по той же причине |
| Миграции | **не запускались** |
| Деплой | **не выполнялся** |
| Production | **не затрагивался** |
| Изменения кода | **отсутствуют** — созданы только документы в `docs/mobile/` |

Статическая проверка типов и юнит-тесты остаются невыполненными. Это
единственный пункт запрошенных проверок, который не удалось закрыть, и
причина — прямое противоречие с запретом на установку зависимостей.
