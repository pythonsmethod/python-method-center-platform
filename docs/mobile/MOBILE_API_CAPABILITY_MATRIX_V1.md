# MOBILE API CAPABILITY MATRIX V1

**Тип документа:** read-only матрица готовности каждой клиентской функции к
использованию мобильным приложением.
**Дата:** 2026-08-01
**Коммит:** `f681584`
**Парный документ:** `MOBILE_PLATFORM_DISCOVERY_V1.md`

---

## Как читать эту матрицу

**Backend endpoint** — то, что реально вызывается. Три типа:

| Обозначение | Значение | Доступно мобильному |
|---|---|---|
| `HTTP` | Настоящий route handler в `app/api/**` или `app/**/route.ts` | Да, при решении вопроса авторизации |
| `SA` | **Server Action** — внутренний RPC React/Next.js, привязанный к сборке и cookie | **Нет** |
| `SDK` | Прямой вызов Supabase (Postgres через RLS или Storage) из клиента | **Да** |
| `SSR` | Данные готовятся Server Component'ом и отдаются как HTML | **Нет** |
| `EXT` | Внешний сервис, уход с платформы | Зависит от правил магазинов |

**Mobile readiness:**

| Метка | Значение |
|---|---|
| 🟢 READY | Работает сегодня без изменений backend |
| 🟡 PARTIAL | Механизм существует, но требует решения по авторизации (MB-01) |
| 🔴 BLOCKED | Требует нового HTTP-эндпоинта или новой инфраструктуры |
| ⚫ N/A | Не предназначено для мобильного клиента |

`Request schema` / `Response schema` описаны так, как они реально
валидируются в коде. Там, где схема не валидируется формально (Server
Actions принимают `FormData`), это указано явно.

---

## Раздел 1. Аутентификация и аккаунт

### 1.1 Регистрация

| Поле | Значение |
|---|---|
| **Функция** | Регистрация по email и паролю |
| **Web route** | `/login` (форма с переключателем режима) |
| **Backend endpoint** | `SA` `signUpWithPassword` |
| **HTTP method** | — (Server Action, POST на текущий URL со служебным заголовком Next.js) |
| **Request schema** | `FormData`: `email: string`, `password: string` (мин. 6), `next?: string` |
| **Response schema** | `AuthActionState` = `{status:"error", message:string}` \| `{status:"success", message:string}` \| `redirect()` |
| **Authentication** | Не требуется |
| **User role** | гость |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🟢 **READY через обходной путь** — мобильный Supabase SDK вызывает `auth.signUp()` напрямую |
| **Gaps** | Реферальная атрибуция (`attachReferral` из cookie `pm-ref`) при прямом вызове SDK **потеряется** — `lib/auth/actions.ts:123-129`. `emailRedirectTo` ведёт на веб (MB-07) |
| **Файлы** | `lib/auth/actions.ts:89-139`, `app/(auth)/login/AuthForm.tsx`, `lib/referrals/queries.ts` |

### 1.2 Вход

| Поле | Значение |
|---|---|
| **Функция** | Вход по email и паролю |
| **Web route** | `/login` |
| **Backend endpoint** | `SA` `signInWithPassword` |
| **HTTP method** | — |
| **Request schema** | `FormData`: `email: string`, `password: string`, `next?: string` (санитизируется: должен начинаться с `/` и не с `//`) |
| **Response schema** | `AuthActionState` \| `redirect(next)` |
| **Authentication** | Не требуется |
| **User role** | гость |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🟢 **READY через обходной путь** — `auth.signInWithPassword()` мобильным SDK |
| **Gaps** | Логика «персонал → `/admin`» (`lib/auth/actions.ts:74-84`) при прямом SDK теряется. Для клиентского приложения не важна |
| **Файлы** | `lib/auth/actions.ts:45-87` |

### 1.3 Выход

| Поле | Значение |
|---|---|
| **Функция** | Выход из аккаунта |
| **Web route** | Кнопка в кабинете |
| **Backend endpoint** | `SA` `logoutAction` |
| **HTTP method** | — |
| **Request schema** | Нет параметров |
| **Response schema** | `redirect("/login")` |
| **Authentication** | Сессия |
| **User role** | любой |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🟢 **READY** — `auth.signOut()` мобильным SDK |
| **Gaps** | Нет |
| **Файлы** | `lib/auth/actions.ts:233-241`, `components/LogoutButton.tsx` |

### 1.4 Запрос восстановления пароля

| Поле | Значение |
|---|---|
| **Функция** | Письмо со ссылкой смены пароля |
| **Web route** | `/recovery` |
| **Backend endpoint** | `SA` `requestPasswordReset` |
| **HTTP method** | — |
| **Request schema** | `FormData`: `email: string` (валидация `lib/auth/validation.ts`) |
| **Response schema** | `AuthActionState`; ответ **одинаков** независимо от существования аккаунта |
| **Authentication** | Не требуется |
| **User role** | гость |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🟡 **PARTIAL** — `auth.resetPasswordForEmail()` доступен SDK, но `redirectTo` ведёт на `{origin}/auth/callback?next=/reset-password` |
| **Gaps** | MB-07: без deep link человек попадёт в браузер, а не в приложение |
| **Файлы** | `lib/auth/actions.ts:143-183`, `app/(auth)/recovery/RecoveryForm.tsx` |

### 1.5 Установка нового пароля

| Поле | Значение |
|---|---|
| **Функция** | Смена пароля по recovery-сессии |
| **Web route** | `/reset-password` |
| **Backend endpoint** | `SA` `updatePassword` |
| **HTTP method** | — |
| **Request schema** | `FormData`: `password: string`, `confirm: string` |
| **Response schema** | `AuthActionState` с отдельным сообщением при совпадении со старым паролем |
| **Authentication** | Recovery-сессия (создаётся `/auth/callback`) |
| **User role** | client |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🟡 **PARTIAL** — `auth.updateUser({password})` доступен SDK при наличии сессии |
| **Gaps** | Зависит от MB-07 |
| **Файлы** | `lib/auth/actions.ts:187-231` |

### 1.6 Обмен кода на сессию (auth callback)

| Поле | Значение |
|---|---|
| **Функция** | Подтверждение email / вход по ссылке |
| **Web route** | `/auth/callback` |
| **Backend endpoint** | `HTTP` `GET /auth/callback` |
| **HTTP method** | `GET` |
| **Request schema** | Query: `code: string`, `next?: string` (санитизируется) |
| **Response schema** | `302` редирект; при ошибке — на `/login?message=link-invalid` или `/recovery?message=link-invalid` |
| **Authentication** | Код из письма |
| **User role** | любой |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🔴 **BLOCKED** — отдаёт редирект и ставит cookie |
| **Gaps** | MB-07. Мобильному нужен `exchangeCodeForSession` внутри приложения после deep link |
| **Файлы** | `app/auth/callback/route.ts:12-40` |

---

## Раздел 2. Онбординг и кейс

### 2.1 Отправка анкеты (создание кейса)

| Поле | Значение |
|---|---|
| **Функция** | Анкета → создание кейса + фиксация согласий |
| **Web route** | `/onboarding` |
| **Backend endpoint** | `SA` `submitOnboarding` |
| **HTTP method** | — |
| **Request schema** | `FormData`: `fullName`, `phone`, `careRecipientType` (`self` \| `family_member`), `primaryGoal`, `situationDescription`, `offerAccepted` (`"on"`, обязателен), `consentAccepted` (`"on"`, обязателен) |
| **Response schema** | `OnboardingActionState` \| `redirect("/cabinet?onboarding=submitted")` |
| **Authentication** | Обязательна |
| **User role** | client |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🔴 **BLOCKED** |
| **Gaps** | **MB-11 — самый опасный пробел матрицы.** RLS формально позволяет клиенту вставить `client_cases` и `onboarding_submissions` напрямую (политики `client_cases_insert_own`, `onboarding_submissions_insert_own`). Но действие делает **девять связанных записей**: profile upsert, кейс, анкета, 2 записи согласий, 3-4 записи аудита, 2-3 lifecycle-события. Прямая вставка через SDK создаст кейс **без зафиксированных согласий и без аудита** — юридически и этически недопустимо. Требуется HTTP-эндпоинт |
| **Файлы** | `lib/onboarding/actions.ts:31-310`, `app/(client)/onboarding/OnboardingForm.tsx`, `lib/legal/offer.ts` |

### 2.2 Просмотр статуса кейса

| Поле | Значение |
|---|---|
| **Функция** | Текущий статус, срочность, направление, дата открытия |
| **Web route** | `/cabinet`, `/cabinet/account` |
| **Backend endpoint** | `SSR` + `SDK` `select` из `client_cases` |
| **HTTP method** | — (в вебе SSR; для мобильного — `SDK` select) |
| **Request schema** | `select("id, case_number, status, urgency, direction, title, summary, created_at, updated_at").eq("profile_id", uid).maybeSingle()` |
| **Response schema** | `ClientCaseShell \| null`. `status` — enum из 8 значений (`created`, `awaiting_onboarding`, `ready_for_review`, `in_review`, `active_support`, `inactive_support`, `completed`, `archived`) |
| **Authentication** | Обязательна |
| **User role** | client |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🟢 **READY** — RLS `client_cases_select_own` пропускает запрос |
| **Gaps** | Локализованные подписи статусов живут в `lib/i18n/status-labels.ts` — мобильному нужен свой словарь или дублирование |
| **Файлы** | `lib/cases/queries.ts:27-58`, миграция `20260621220000_create_core_schema.sql:481-484` |

### 2.3 История кейса

| Поле | Значение |
|---|---|
| **Функция** | Лента событий жизненного цикла (до 50) |
| **Web route** | `/cabinet/account` |
| **Backend endpoint** | `SSR` + `SDK` `select` из `case_lifecycle_events` |
| **HTTP method** | — |
| **Request schema** | `select("id, event_type, from_status, to_status, actor_role, notes, created_at").eq("profile_id",uid).eq("case_id",caseId).order("created_at",desc).limit(50)` |
| **Response schema** | `CaseLifecycleEvent[]`; `event_type` — enum из 10 значений |
| **Authentication** | Обязательна |
| **User role** | client |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🟢 **READY** — RLS `case_lifecycle_events_select_own` |
| **Gaps** | Нет |
| **Файлы** | `lib/cases/queries.ts:70-99`, миграция строка 538-541 |

### 2.4 «Следующий шаг» в кабинете

| Поле | Значение |
|---|---|
| **Функция** | Один рекомендованный шаг, вычисленный из реального состояния |
| **Web route** | `/cabinet` |
| **Backend endpoint** | `SSR` — чистая функция на сервере |
| **HTTP method** | — |
| **Request schema** | `{hasCase: boolean, documents: number, status: string \| null}` |
| **Response schema** | `{title, text, action, href}` |
| **Authentication** | Обязательна |
| **User role** | client |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🟢 **READY** — логика тривиально воспроизводится на клиенте из данных 2.2 и 3.2 |
| **Gaps** | При дублировании логики на мобильном возникает риск расхождения с вебом |
| **Файлы** | `app/(client)/cabinet/page.tsx:35-73` |

---

## Раздел 3. Документы

### 3.1 Загрузка документа в Storage

| Поле | Значение |
|---|---|
| **Функция** | Загрузка файла в приватный бакет |
| **Web route** | `/cabinet/documents` |
| **Backend endpoint** | `SDK` Supabase Storage `upload()` — **прямо из клиента** |
| **HTTP method** | `POST` (внутри Supabase SDK) |
| **Request schema** | Bucket `client-documents`, путь `{userId}/{caseId}/{documentId}/{safeFilename}`; опции `{cacheControl:"3600", contentType, upsert:false}`. Ограничения: ≤ 25 МБ, MIME из `application/pdf`, `image/png`, `image/jpeg`, `image/webp` |
| **Response schema** | `{error}` или успех |
| **Authentication** | Обязательна (anon key + сессия) |
| **User role** | client |
| **File upload** | **Да** |
| **Realtime** | Нет |
| **Mobile readiness** | 🟢 **READY** — Storage RLS требует, чтобы первый сегмент пути был `auth.uid()`; мобильный SDK делает ровно то же |
| **Gaps** | Имя файла санитизируется до ASCII (`sanitizeOriginalFilename`) — мобильный обязан применять **точно ту же** функцию, иначе серверная проверка пути в 3.2 отклонит запись |
| **Файлы** | `app/(client)/cabinet/DocumentUploadPanel.tsx:156-171`, `lib/documents/config.ts:43-129`, `supabase/storage_manual_setup.md:71-91` |

### 3.2 Регистрация метаданных документа

| Поле | Значение |
|---|---|
| **Функция** | Запись строки `uploaded_documents` после загрузки файла |
| **Web route** | `/cabinet/documents` (вторая половина того же действия) |
| **Backend endpoint** | `SA` `recordUploadedDocumentMetadata` |
| **HTTP method** | — |
| **Request schema** | Типизированный объект (не FormData): `{caseId: uuid, documentId: uuid, storagePath: string, originalFilename: string, mimeType: string, fileSize: number}` |
| **Response schema** | `{status:"success", document: UploadedDocument}` \| `{status:"error", message: string}` |
| **Authentication** | Обязательна |
| **User role** | client |
| **File upload** | Нет (файл уже в Storage) |
| **Realtime** | Нет |
| **Mobile readiness** | 🔴 **BLOCKED** |
| **Gaps** | **MB-02.** Действие выполняет четыре серверные проверки, которые нельзя перенести на клиент: путь совпадает с ожидаемым; кейс принадлежит пользователю; объект **реально существует** в Storage; запись аудита. Прямая вставка через SDK возможна по RLS (`uploaded_documents_insert_own`) и триггер даже заставит `document_status='uploaded'` и проверит префикс пути — но **аудит-лог не будет записан**. Требуется HTTP-эндпоинт |
| **Файлы** | `lib/documents/actions.ts:37-158`, `supabase/migrations/20260709120000_launch_hardening.sql:15-60` |

### 3.3 Список своих документов

| Поле | Значение |
|---|---|
| **Функция** | Перечень загруженных документов с метаданными |
| **Web route** | `/cabinet`, `/cabinet/documents` |
| **Backend endpoint** | `SSR` + `SDK` `select` из `uploaded_documents` |
| **HTTP method** | — |
| **Request schema** | `select(...).eq("profile_id", uid).eq("case_id", caseId)` |
| **Response schema** | `UploadedDocument[]`: `id`, `document_type`, `status`, `document_status`, `storage_path`, `original_filename`, `metadata` (mime_type, file_size), `created_at` |
| **Authentication** | Обязательна |
| **User role** | client |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🟢 **READY** — RLS `uploaded_documents_select_own` |
| **Gaps** | Нет |
| **Файлы** | `lib/documents/queries.ts`, миграция строка 507-510 |

### 3.4 Открытие своего документа

| Поле | Значение |
|---|---|
| **Функция** | Просмотр файла по временной ссылке |
| **Web route** | Кнопка «Открыть» в кабинете |
| **Backend endpoint** | `SDK` Storage `createSignedUrl(path, 60)` — **прямо из клиента** |
| **HTTP method** | — |
| **Request schema** | `storage.from("client-documents").createSignedUrl(storage_path, 60)` |
| **Response schema** | `{signedUrl: string}` — **живёт 60 секунд** |
| **Authentication** | Обязательна |
| **User role** | client |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🟢 **READY** — механизм полностью переносим |
| **Gaps** | Веб открывает `window.open` (W-09) — мобильному нужен нативный просмотрщик. **Signed URL нельзя кэшировать на устройстве** — см. `MOBILE_SECURITY_BOUNDARY_V1.md` |
| **Файлы** | `app/(client)/cabinet/DocumentUploadPanel.tsx:79-108` |

---

## Раздел 4. Чат по кейсу

### 4.1 Чтение ленты сообщений

| Поле | Значение |
|---|---|
| **Функция** | Лента переписки с командой (текст + голос) |
| **Web route** | `/cabinet/chat` |
| **Backend endpoint** | `HTTP` `GET /api/messages/thread` |
| **HTTP method** | `GET` |
| **Request schema** | Query: `caseId?: uuid` — **обязателен для персонала, игнорируется для клиента** (кейс клиента определяется по сессии) |
| **Response schema** | `{messages: CaseMessage[]}` где `CaseMessage = {id, sender_role, body: string\|null, audio_path: string\|null, audio_duration_seconds: number\|null, created_at, audioUrl: string\|null}`. Лимит 200, сортировка по возрастанию. Ошибки: `{error: string}` со статусом 400/401/502/503 |
| **Authentication** | **Обязательна — только через cookie** |
| **User role** | client (свой кейс) / staff (любой) |
| **File upload** | Нет |
| **Realtime** | **Polling 3 с**, только пока вкладка видима |
| **Mobile readiness** | 🟡 **PARTIAL** |
| **Gaps** | **MB-01** — нет Bearer-авторизации. Побочный эффект: GET **помечает сообщения прочитанными** (`markThreadRead`) — для мобильного это может быть нежелательно при фоновом обновлении. `audioUrl` подписан на **1 час** (SR-08). Альтернатива: читать `case_messages` напрямую через SDK (RLS `case_messages_select_own` разрешает), но тогда `audioUrl` придётся подписывать самостоятельно, и прочтение не будет отмечено |
| **Файлы** | `app/api/messages/thread/route.ts:12-69`, `lib/messages/queries.ts:23-44,102-139` |

### 4.2 Отправка текстового сообщения

| Поле | Значение |
|---|---|
| **Функция** | Текст в чат кейса |
| **Web route** | `/cabinet/chat` |
| **Backend endpoint** | `SA` `sendClientCaseMessage` |
| **HTTP method** | — |
| **Request schema** | `FormData`: `body: string` (1–8000 символов) |
| **Response schema** | `StaffActionState` = `{status:"success"\|"error", message: string}` |
| **Authentication** | Обязательна |
| **User role** | client |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🔴 **BLOCKED** |
| **Gaps** | **MB-12.** RLS даёт клиенту на `case_messages` **только SELECT** — INSERT-политики нет вовсе. Вставка идёт service-role. Плюс действие вызывает `notifyTeam()` → Telegram. Прямой обход невозможен даже теоретически. Требуется HTTP-эндпоинт |
| **Файлы** | `lib/messages/actions.ts:16-83`, миграция `20260722150000_case_messages_voice.sql:32-36` |

### 4.3 Отправка голосового сообщения

| Поле | Значение |
|---|---|
| **Функция** | Голосовое сообщение в чат кейса |
| **Web route** | `/cabinet/chat` |
| **Backend endpoint** | `HTTP` `POST /api/messages/audio` |
| **HTTP method** | `POST` (multipart/form-data) |
| **Request schema** | `FormData`: `audio: Blob` (≤ 10 МБ, MIME из `audio/webm`, `audio/mp4`, `audio/mpeg`, `audio/ogg`, `audio/wav`), `duration?: number` (0–3600 с), `caseId?: uuid` (только для персонала) |
| **Response schema** | `{ok: true}`; ошибки `{error: string}` со статусом 400 / 401 / 413 (слишком большой) / 415 (формат) / 404 / 502 / 503 |
| **Authentication** | **Обязательна — только через cookie** |
| **User role** | client / staff |
| **File upload** | **Да** |
| **Realtime** | Нет |
| **Mobile readiness** | 🟡 **PARTIAL** |
| **Gaps** | **MB-01.** Формат: iOS штатно пишет `audio/mp4` (m4a) — **входит в разрешённый список**; Android — `audio/mp4`/`audio/ogg` — тоже. Транзакционность реализована корректно: при провале вставки в БД файл удаляется из Storage (`route.ts:151`) |
| **Файлы** | `app/api/messages/audio/route.ts:26-173`, `components/messages/VoiceRecorder.tsx` |

### 4.4 Счётчик непрочитанных

| Поле | Значение |
|---|---|
| **Функция** | Количество непрочитанных сообщений от команды |
| **Web route** | Шелл кабинета (бейдж) |
| **Backend endpoint** | `SSR` — service-role `count` по `case_messages` |
| **HTTP method** | — |
| **Request schema** | `count` где `case_id = ?`, `sender_role != 'client'`, `read_at is null` |
| **Response schema** | `number` |
| **Authentication** | Обязательна |
| **User role** | client |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🟢 **READY** — тот же подсчёт возможен через SDK: RLS даёт SELECT на свои `case_messages`, поля `sender_role` и `read_at` доступны |
| **Gaps** | Веб-реализация использует service-role, но для клиента RLS достаточно |
| **Файлы** | `lib/messages/queries.ts:79-98`, `app/(client)/cabinet/layout.tsx:25-28` |

---

## Раздел 5. Поддержка

### 5.1 Обращение из кабинета

| Поле | Значение |
|---|---|
| **Функция** | Обращение в поддержку от авторизованного клиента |
| **Web route** | `/cabinet/chat` |
| **Backend endpoint** | `SA` `createSupportRequest` |
| **HTTP method** | — |
| **Request schema** | `FormData`: `subject: string` (1–200), `body: string` (1–5000) |
| **Response schema** | `SupportRequestActionState` |
| **Authentication** | Обязательна |
| **User role** | client |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🔴 **BLOCKED** (частичный обход возможен, но некорректен) |
| **Gaps** | RLS `support_requests_insert_own` **позволяет** клиенту вставить строку напрямую. Но действие дополнительно пишет аудит-лог, lifecycle-событие и отправляет Telegram-уведомление команде. Прямая вставка = **обращение, о котором команда не узнает**. Требуется HTTP-эндпоинт |
| **Файлы** | `lib/support/actions.ts:32-132`, миграция строка 548-551 |

### 5.2 Публичное обращение без аккаунта

| Поле | Значение |
|---|---|
| **Функция** | Гостевое обращение с указанием email для ответа |
| **Web route** | `/support` |
| **Backend endpoint** | `SA` `submitPublicSupportRequest` |
| **HTTP method** | — |
| **Request schema** | `FormData`: `email`, `category` (`login`\|`payment`\|`technical`\|`other`), `message`, `consent` (`"on"`), `website` (honeypot — должен быть пуст) |
| **Response schema** | `SupportRequestActionState` |
| **Authentication** | Не требуется |
| **User role** | гость |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🔴 **BLOCKED** |
| **Gaps** | Пишется service-role (`profile_id = null`) — прямой обход невозможен. Rate limit 5/час per-instance (MB-10) |
| **Файлы** | `lib/support/public-actions.ts:45-119`, `lib/support/validation.ts` |

### 5.3 История своих обращений

| Поле | Значение |
|---|---|
| **Функция** | Список обращений со статусами |
| **Web route** | `/cabinet/chat` |
| **Backend endpoint** | `SSR` + `SDK` `select` из `support_requests` |
| **HTTP method** | — |
| **Request schema** | `select(...).eq("profile_id", uid)` |
| **Response schema** | `{id, subject, body, status, created_at}`; `status` — enum из 6 значений |
| **Authentication** | Обязательна |
| **User role** | client |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🟢 **READY** — RLS `support_requests_select_own` |
| **Gaps** | Нет |
| **Файлы** | `lib/support/queries.ts`, миграция строка 543-546 |

---

## Раздел 6. ИИ-помощник

### 6.1 Клиентский ИИ-помощник (3 уровня)

| Поле | Значение |
|---|---|
| **Функция** | ИИ-консультант: гость / зарегистрированный / оплативший |
| **Web route** | Виджет на всех страницах |
| **Backend endpoint** | `HTTP` `POST /api/assistant/client` |
| **HTTP method** | `POST` (application/json) |
| **Request schema** | `{messages: Array<{role: "user"\|"assistant", content: string}>, locale?: "ru"\|"en"}`. Валидация: массив непустой, каждая роль строго `user`/`assistant`, `content` — непустая строка; берутся последние `MAX_HISTORY_MESSAGES` |
| **Response schema** | `{reply: string}` (200). Ошибки: `{error: string}` со статусом 400 / 429 / 502 / 503. **Особый случай:** при исчерпании лимита возвращается `{reply}` со статусом **200** — приглашение зарегистрироваться, а не ошибка |
| **Authentication** | **Опциональна** — но именно она определяет уровень ответа |
| **User role** | guest / registered / client |
| **File upload** | Нет (вложения только у персонала) |
| **Realtime** | Нет (запрос-ответ) |
| **Mobile readiness** | 🟡 **PARTIAL** |
| **Gaps** | **MB-09** — тир определяется `resolveAssistantAudience()` из cookie-сессии. Мобильный клиент без cookie **всегда получит уровень `guest`** с лимитом 15 сообщений в сутки, а оплативший клиент не увидит персональный ИИ своего кейса. Это делает функцию малополезной на мобильном без решения MB-01. Дополнительно: **история диалога не сохраняется** — клиент обязан присылать её целиком |
| **Файлы** | `app/api/assistant/client/route.ts:58-202`, `lib/assistant/tiers.ts:84-236`, `lib/assistant/guard.ts:105-174`, `lib/assistant/claude.ts:36-60` |

### 6.2 Голосовой ввод в ИИ-чат

| Поле | Значение |
|---|---|
| **Функция** | Диктовка вопроса голосом |
| **Web route** | Виджет ИИ |
| **Backend endpoint** | **Отсутствует** — распознавание в браузере |
| **HTTP method** | — |
| **Request schema** | — |
| **Response schema** | — |
| **Authentication** | — |
| **User role** | любой |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🔴 **BLOCKED** (W-11) |
| **Gaps** | Реализовано через Web Speech API (`SpeechRecognition`/`webkitSpeechRecognition`), которого на мобильных платформах нет. Требуется нативный STT — **серверных изменений не требует** |
| **Файлы** | `components/assistant/useVoiceInput.ts:29-39,77` |

### 6.3 Автоматическая эскалация красных флагов

| Поле | Значение |
|---|---|
| **Функция** | Распознавание кризисной ситуации в диалоге и оповещение команды |
| **Web route** | Побочный эффект 6.1 |
| **Backend endpoint** | Внутри `POST /api/assistant/client` |
| **HTTP method** | — |
| **Request schema** | — (маркер `[RED_FLAG:physical\|psychological]` в ответе модели) |
| **Response schema** | Маркер **вырезается** из ответа; клиент его не видит |
| **Authentication** | Работает и для гостя |
| **User role** | любой |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🟢 **READY** — работает автоматически при любом вызове 6.1 |
| **Gaps** | Мобильный клиент **не должен** пытаться самостоятельно интерпретировать или отображать маркер. Границы ответственности ИИ — в `MOBILE_SECURITY_BOUNDARY_V1.md` |
| **Файлы** | `lib/assistant/red-flags.ts:12-116` |

### 6.4 ИИ команды с вложениями

| Поле | Значение |
|---|---|
| **Функция** | ИИ-помощник персонала: контекст кейса + до 30 файлов |
| **Web route** | `/admin` |
| **Backend endpoint** | `HTTP` `POST /api/assistant/staff` |
| **HTTP method** | `POST` (application/json) |
| **Request schema** | `{messages, attachments?: Array<{name, mediaType, data: base64}>, provider?: "auto"\|"best"\|"claude"\|"gpt"\|"both", caseId?: uuid}`. Лимиты: 12 файлов на запрос, 2.5 МБ на файл, 3.2 МБ суммарно, 30 файлов на сообщение |
| **Response schema** | `{reply: string}` \| `{error: string}` (400/403/502/503) |
| **Authentication** | Обязательна, роль `support`/`admin` |
| **User role** | staff |
| **File upload** | **Да** (base64 в JSON) |
| **Realtime** | Нет |
| **Mobile readiness** | ⚫ **N/A для клиентского приложения** |
| **Gaps** | Актуально только для отдельного admin-приложения (MB-15). Вложения **нигде не сохраняются** — уходят в модель и исчезают |
| **Файлы** | `app/api/assistant/staff/route.ts:15-100`, `lib/assistant/attachments.ts` |

---

## Раздел 7. Платежи и тарифы

### 7.1 Просмотр тарифов

| Поле | Значение |
|---|---|
| **Функция** | Список планов сопровождения |
| **Web route** | `/payment` |
| **Backend endpoint** | `SSR` — читается из переменных окружения |
| **HTTP method** | — |
| **Request schema** | `getPaymentPlans(locale)` |
| **Response schema** | `PaymentPlan[]`: `{product, title, description, priceLine, paymentLinkUrl, paypalUrl}`. Продукты: `support_5_weeks` ($1440), `support_15_weeks` ($3675, в UI «100 дней»), `test_access` ($3) |
| **Authentication** | Не требуется |
| **User role** | любой |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🔴 **BLOCKED** |
| **Gaps** | Данные тарифов существуют **только как переменные окружения на сервере**, HTTP-эндпоинта для их чтения нет. Мобильному пришлось бы дублировать цены в бандле — тогда изменение цены потребует релиза приложения |
| **Файлы** | `lib/payments/config.ts:9-98`, `components/payments/PaymentPlans.tsx` |

### 7.2 Оплата

| Поле | Значение |
|---|---|
| **Функция** | Покупка сопровождения |
| **Web route** | `/payment` → внешний переход |
| **Backend endpoint** | `EXT` Stripe Payment Link / PayPal |
| **HTTP method** | — |
| **Request schema** | — (внешняя страница Stripe) |
| **Response schema** | — |
| **Authentication** | Не требуется (гость может оплатить) |
| **User role** | любой |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🔴 **BLOCKED — требует продуктового и юридического решения** |
| **Gaps** | **MB-06.** Оплата уходит на внешнюю страницу. Правила App Store и Google Play в части цифровых услуг требуют отдельного анализа — см. `MOBILE_DISCOVERY_OPEN_QUESTIONS_V1.md`. Технически: платформа определяет клиента по `client_reference_id` или email — в вебе `client_reference_id` **не передаётся явно** ни в одном найденном месте, что означает опору на совпадение email (SR-06) |
| **Файлы** | `lib/payments/config.ts:72-86`, `app/api/stripe/webhook/route.ts:154-176` |

### 7.3 Фиксация согласия с офертой при оплате

| Поле | Значение |
|---|---|
| **Функция** | Запись `consent_records` при нажатии оплаты |
| **Web route** | `/payment` |
| **Backend endpoint** | `SA` `recordPaymentOfferAcceptance` |
| **HTTP method** | — |
| **Request schema** | `product: string` (из белого списка) |
| **Response schema** | `void` — **best-effort, никогда не бросает исключение** |
| **Authentication** | Опциональна (для гостя ничего не пишется) |
| **User role** | client |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🔴 **BLOCKED** |
| **Gaps** | RLS `consent_records_insert_own` формально позволяет вставку через SDK, но дедупликация (проверка `contains("metadata", {product})`) должна выполняться на сервере. Связано с 7.2 |
| **Файлы** | `lib/payments/actions.ts:15-64` |

### 7.4 Заявка на альтернативный способ оплаты

| Поле | Значение |
|---|---|
| **Функция** | Обращение для тех, чью карту Stripe не принимает |
| **Web route** | `/payment/other` |
| **Backend endpoint** | `SA` `submitAltPaymentRequest` |
| **HTTP method** | — |
| **Request schema** | `FormData` (валидация в `lib/payments/alt-validation.ts`, покрыта тестом `tests/alt-payment-validation.test.ts`) |
| **Response schema** | Action state |
| **Authentication** | Не требуется |
| **User role** | любой |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🔴 **BLOCKED** |
| **Gaps** | MB-02 |
| **Файлы** | `lib/payments/alt-request-action.ts:43`, `lib/payments/alt-methods.ts` |

### 7.5 Просмотр своих оплат

| Поле | Значение |
|---|---|
| **Функция** | Список оплат с суммами и статусами |
| **Web route** | `/cabinet/account` |
| **Backend endpoint** | `SSR` + `SDK` `select` из `payments` |
| **HTTP method** | — |
| **Request schema** | `select(...).eq("profile_id", uid)` |
| **Response schema** | `{id, product, status, amount_cents, currency, paid_at}`; `status` — enum из 6 значений |
| **Authentication** | Обязательна |
| **User role** | client |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🟢 **READY** — RLS `payments_select_own`. Политика вставки для клиента **была удалена** при hardening — только чтение |
| **Gaps** | Нет |
| **Файлы** | `lib/payments/queries.ts`, миграция строка 523-526, `20260709120000_launch_hardening.sql:10` |

### 7.6 Состояние подписки (период сопровождения)

| Поле | Значение |
|---|---|
| **Функция** | Активный период сопровождения: продукт, даты, статус |
| **Web route** | Используется в контексте ИИ; отдельного экрана нет |
| **Backend endpoint** | `SDK` `select` из `service_periods` |
| **HTTP method** | — |
| **Request schema** | `select("product, status, starts_at, ends_at").eq("case_id", caseId)` |
| **Response schema** | `status` — enum `scheduled` \| `active` \| `completed` \| `cancelled` |
| **Authentication** | Обязательна |
| **User role** | client |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🟢 **READY** — RLS `service_periods_select_own` |
| **Gaps** | В вебе **нет отдельного клиентского экрана** этих данных — они читаются только для контекста ИИ (`lib/assistant/tiers.ts:184-188`). Мобильный экран «моя подписка» был бы **новой функцией**, а не переносом существующей |
| **Файлы** | миграция строка 262-279,533-536, `lib/assistant/tiers.ts:184-215` |

---

## Раздел 8. Рефералы и токены

### 8.1 Реферальный код и список приглашённых

| Поле | Значение |
|---|---|
| **Функция** | Личный код `PM-XXXXXX` и статистика приглашений |
| **Web route** | Панель в кабинете |
| **Backend endpoint** | `SSR` + `SDK` `select` из `referrals` / `profiles.referral_code` |
| **HTTP method** | — |
| **Request schema** | `select(...).eq("referrer_profile_id", uid)` |
| **Response schema** | `{id, referred_profile_id, code, source, created_at}` |
| **Authentication** | Обязательна |
| **User role** | client |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🟢 **READY (чтение)** — RLS `referrals_select_own` |
| **Gaps** | Код генерируется **лениво при первом просмотре кабинета** (комментарий в миграции) — если мобильное приложение станет первым местом просмотра, генерация выполняется server-side и мобильному недоступна. Атрибуция приглашённого завязана на cookie `pm-ref` (W-07) — на мобильном требуется другой механизм |
| **Файлы** | `lib/referrals/queries.ts`, `lib/referrals/code.ts`, `20260725120000_referrals.sql:17-48` |

### 8.2 Баланс и история токенов

| Поле | Значение |
|---|---|
| **Функция** | Append-only ledger: баланс, начислено, потрачено |
| **Web route** | `/cabinet/tokens` |
| **Backend endpoint** | `SSR` + `SDK` `select` из `token_transactions` |
| **HTTP method** | — |
| **Request schema** | `select("id, amount, reason, note, created_at").eq("profile_id", uid).order(desc).limit(50)` |
| **Response schema** | `TokenLedger = {status, balance, earned, spent, transactions[]}`. Баланс = `SUM(amount)`, положительные = начисления |
| **Authentication** | Обязательна |
| **User role** | client |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🟢 **READY** — RLS `token_transactions_select_own` |
| **Gaps** | Веб показывает баланс по последним 50 транзакциям; авторитетный баланс считается отдельной функцией по всей таблице (`getTokenBalance`). Мобильный должен использовать полную сумму, а не последние 50 |
| **Файлы** | `lib/tokens/queries.ts:31-75`, `20260725140000_referral_tokens.sql:33-39` |

### 8.3 Погашение токенов в промокод

| Поле | Значение |
|---|---|
| **Функция** | Токены → одноразовый промокод Stripe |
| **Web route** | `/cabinet/tokens` |
| **Backend endpoint** | `SA` `redeemTokens` |
| **HTTP method** | — |
| **Request schema** | `FormData`: `amount: integer` (≥ `MIN_REDEEM_TOKENS`, ≤ баланса) |
| **Response schema** | `RedeemState`: `{status:"success", code: string, message}` \| `{status:"error", message}` |
| **Authentication** | Обязательна |
| **User role** | client |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🔴 **BLOCKED** |
| **Gaps** | **Принципиально не обходится.** Действие вызывает **Stripe secret API** (создание купона и промокода) — ключ `STRIPE_SECRET_KEY` не может находиться в мобильном приложении. Плюс компенсирующая логика: при провале записи в ledger промокод деактивируется. Требуется HTTP-эндпоинт |
| **Файлы** | `lib/tokens/actions.ts:25-123`, `lib/tokens/config.ts` |

---

## Раздел 9. Прочее

### 9.1 Публичная оферта

| Поле | Значение |
|---|---|
| **Функция** | Просмотр публичной оферты |
| **Web route** | `/legal/offer` |
| **Backend endpoint** | Статический файл `public/legal/python-method-oferta-v2.pdf` |
| **HTTP method** | `GET` |
| **Request schema** | — |
| **Response schema** | PDF |
| **Authentication** | Не требуется |
| **User role** | любой |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🟢 **READY** — файл доступен по прямому URL |
| **Gaps** | Нужен нативный PDF-просмотр (W-20). Версия оферты (`OFFER_VERSION`) захардкожена в `lib/legal/offer.ts` — мобильный должен читать её с сервера, иначе согласия будут фиксироваться с неверной версией |
| **Файлы** | `app/(public)/legal/offer/page.tsx`, `lib/legal/offer.ts` |

### 9.2 Экстренное уведомление

| Поле | Значение |
|---|---|
| **Функция** | Кризисный блок с контактами экстренной помощи |
| **Web route** | `/support`, `/cabinet/chat` |
| **Backend endpoint** | Статический компонент |
| **HTTP method** | — |
| **Request schema** | — |
| **Response schema** | — |
| **Authentication** | Не требуется |
| **User role** | любой |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🟢 **READY** — контент статичен |
| **Gaps** | **Обязателен к переносу в мобильное приложение.** Содержимое захардкожено в компоненте; при изменении потребуется релиз приложения |
| **Файлы** | `components/EmergencyNotice.tsx` |

### 9.3 Переключение языка

| Поле | Значение |
|---|---|
| **Функция** | RU / EN |
| **Web route** | Все публичные страницы |
| **Backend endpoint** | Cookie `pm-locale` + перезагрузка |
| **HTTP method** | — |
| **Request schema** | — |
| **Response schema** | — |
| **Authentication** | Не требуется |
| **User role** | любой |
| **File upload** | Нет |
| **Realtime** | Нет |
| **Mobile readiness** | 🔴 **BLOCKED как механизм**, 🟢 как данные |
| **Gaps** | W-06, W-08. Словари живут в `lib/i18n/dictionaries.ts` и доступны только на сервере. Кабинет и админка **русскоязычны независимо от переключателя** (`README.md:9-11`) |
| **Файлы** | `lib/i18n/locale.ts`, `lib/i18n/dictionaries.ts`, `components/LanguageSwitcher.tsx` |

### 9.4 Push-уведомления

| Поле | Значение |
|---|---|
| **Функция** | Уведомление клиента о новом сообщении, смене статуса, оплате |
| **Web route** | **Не существует** |
| **Backend endpoint** | **Не существует** |
| **HTTP method** | — |
| **Request schema** | — |
| **Response schema** | — |
| **Authentication** | — |
| **User role** | — |
| **File upload** | — |
| **Realtime** | — |
| **Mobile readiness** | 🔴 **BLOCKED — инфраструктуры нет** |
| **Gaps** | **MB-03.** Проверено: ни FCM, ни APNs, ни OneSignal, ни web-push, ни service worker, ни таблицы токенов устройств. Единственный канал уведомлений — Telegram, и он адресован **команде, а не клиенту** (`lib/notifications/notify.ts:35`). Существующая таблица `notification_events` с dedupe-ключом, счётчиком попыток и статусами — **хороший фундамент** для будущего push-канала, но сейчас у неё один транспорт |
| **Файлы** | `lib/notifications/notify.ts:35-99`, `lib/notifications/telegram.ts`, `20260723120000_launch_closure_sprint.sql:6-24` |

### 9.5 Email- и SMS-уведомления клиенту

| Поле | Значение |
|---|---|
| **Функция** | Письма и SMS клиенту |
| **Web route** | — |
| **Backend endpoint** | **Только встроенные письма Supabase Auth** (подтверждение регистрации, восстановление пароля) |
| **HTTP method** | — |
| **Request schema** | — |
| **Response schema** | — |
| **Authentication** | — |
| **User role** | — |
| **File upload** | — |
| **Realtime** | — |
| **Mobile readiness** | ⚫ **N/A** |
| **Gaps** | Транзакционной email-рассылки нет: не найдено SendGrid, Resend, nodemailer, SMTP. SMS нет: не найдено Twilio. Транспорт для клиента отсутствует полностью |
| **Файлы** | `lib/auth/actions.ts:113,166` (только Supabase Auth) |

---

## Сводная таблица готовности

| Категория | Всего | 🟢 READY | 🟡 PARTIAL | 🔴 BLOCKED | ⚫ N/A |
|---|---|---|---|---|---|
| Аутентификация (1.1–1.6) | 6 | 3 | 2 | 1 | 0 |
| Онбординг и кейс (2.1–2.4) | 4 | 3 | 0 | 1 | 0 |
| Документы (3.1–3.4) | 4 | 3 | 0 | 1 | 0 |
| Чат (4.1–4.4) | 4 | 1 | 2 | 1 | 0 |
| Поддержка (5.1–5.3) | 3 | 1 | 0 | 2 | 0 |
| ИИ (6.1–6.4) | 4 | 1 | 1 | 1 | 1 |
| Платежи (7.1–7.6) | 6 | 2 | 0 | 4 | 0 |
| Рефералы и токены (8.1–8.3) | 3 | 2 | 0 | 1 | 0 |
| Прочее (9.1–9.5) | 5 | 2 | 0 | 2 | 1 |
| **Итого** | **39** | **18** | **5** | **14** | **2** |

**18 из 39 функций (46%) работают сегодня без изменений backend.**
Ещё 5 (13%) разблокируются решением одного вопроса — MB-01
(Bearer-аутентификация). Оставшиеся 14 требуют новых HTTP-эндпоинтов
(9 функций), push-инфраструктуры (1) или продуктовых решений (4).

## Что даёт наибольший эффект

Из 14 заблокированных функций **семь** разблокируются одним типом работы —
созданием HTTP-эндпоинтов поверх уже существующей и уже проверенной логики
Server Actions: 2.1 анкета, 3.2 метаданные документа, 4.2 текст в чат,
5.1 обращение из кабинета, 5.2 публичное обращение, 7.3 согласие с офертой,
8.3 погашение токенов. Бизнес-логика для них написана и работает — не
хватает только транспорта.
