# GPT-Live-1: голосовой пилот ANHAM / ANHAM voice pilot

Дата проверки: 2026-09-10. Ветка `codex/gpt-live-pilot`; синхронизирована с main
`7ae0dd3` (включая существующий релиз подтверждаемых клиентских действий).

## Результат и граница готовности

**GPT-Live-1 connected: YES — реальный синтетический WebRTC-тест.**
**Включено в работающем приложении: NO.** Изменения реализованы в существующем
репозитории; production не менялся. Автоматическая проверка отклонила команду
публикации Vercel: конкретный production-деплой и настройки пилота не подтверждены.
До публикации нужны разрешение на этот релиз, серверные настройки и точный список
трёх аккаунтов. Локальное окружение не содержит настроек Supabase для входа.

## A. Что существовало

Next.js 15 / React 19, серверные маршруты Next.js, Supabase Auth/RLS, общая таблица
`assistant_messages`, база знаний, приватные персоны основателя и Карена, клиентский
контекст, маршрутизация моделей, инструменты архива/сайта/собственного кейса/поиска.
В `AssistantChat` уже был `RealtimeVoice` с контроллером старого Realtime API.
Существующие staff/client handlers остаются источником бизнес-логики.

## B. Что изменилось / Connection and delegation

Для явно включённых аккаунтов существующее голосовое окно использует `LiveBrowser`.
Он получает микрофон, создаёт WebRTC SDP и вызывает `/api/assistant/live`.
Сервер проверяет origin, размер запроса, Supabase-пользователя, не приостановленный
и не закрытый статус профиля (`registered` — статус по умолчанию, в том числе у
владельца и пилотных аккаунтов, поэтому он остаётся разрешённым),
роль, владельца кейса, пилотный allowlist и атомарные квоты. Затем сервер создаёт
сессию `POST https://api.openai.com/v1/live/sessions` с **`gpt-live-1`**.
Браузеру возвращается SDP, а не постоянный ключ. Это официальный unified WebRTC
flow; отдельный ephemeral credential не требуется.

Сервер держит доверенный WebSocket
`wss://api.openai.com/v1/live/sessions/{id}/attach`. Разрешения браузерного канала
ограничены close/mute/unmute; инструкции и результаты из браузера не принимаются.
Безопасные события сервера идут в интерфейс через SSE той же Next.js-функции.
Каноническая политика подключается через `lib/security/ai-transport.ts`.

`session.delegation.created` запускает существующий staff/client POST handler в
request-local контексте инструментов. Сохраняются выбор reasoning-моделей,
персона, память, поиск и разрешения существующего ANHAM. Разговор продолжает
передавать аудио независимо от фоновой задачи. Результат приходит через
`session.commentary.append`. Повторные task ID игнорируются; устаревшие результаты
после новой делегации не озвучиваются. Каждое выполнение инструмента заново
проверяет аккаунт/роль и пишет безопасный аудит. Никакой новой таблицы агентов нет.

## C. Файлы

- `lib/assistant/live-{config,context,backend,session,browser,transcript}.ts`:
  конфигурация, управление сессией, делегация, браузер, расшифровка.
- `app/api/assistant/live/route.ts`: серверный вход и authentication.
- `components/assistant/{AssistantChat,RealtimeVoice,VoicePicker}.tsx`:
  существующее голосовое окно, RU/EN disclosure, pause/mute, статусы, стоимость.
- `lib/assistant/{history,voice-chat,realtime-turns,realtime-contract,realtime-server,conversation-archive}.ts`:
  общая история, отображение непрерывной речи, общий контекст tools/persona.
- `lib/security/{ai-policy,ai-transport}.ts`, `scripts/security-check.mjs`,
  `config/security/existing-api-routes.json`: переиспользованный security foundation
  проекта с проверенным расширением для Live. Непосредственные OpenAI-вызовы в
  openai/openai-archive/voice-web-search/realtime session/voice preview переведены
  на этот транспорт; Claude наследует ту же обязательную политику.
- `config/gpt-live.env.example`, `package.json`, `package-lock.json`,
  `.github/workflows/security.yml`, тесты `live-*`, `ai-security-transport`,
  расширение `realtime-api.test.ts`; operating memory documents.

## D. Память и данные

Новой схемы/таблицы памяти нет, миграции не применялись. Загружаются до 120 последних
строк собственной истории, затем до 12 сгруппированных сообщений по 600 символов.
Остальное доступно по запросу через существующий бэкенд и retrieval.
Общая ролевая персона используется и голосом, и старым voice-контроллером.

Доверенные input/output transcript deltas сохраняются в `assistant_messages`
идемпотентно по session/event/role, с `source=voice_transcript`. У Live нет границ
законченных реплик: `voice_state` остаётся NULL, а не выдуманным completed.
Группировка двух говорящих для чтения не считается разрешением выполнить команду.
Голосовой запрос сохранения долговременной памяти требует проверки текста и
существующей текстовой команды/карточки памяти. Никаких новых прав клиенту.

## E. Проверки — реальные результаты

- Полная регрессия после синхронизации с main: **1676 passed**, 176 файлов; один opt-in provider test skipped
  в обычном запуске и **отдельно выполнен реально: 1 passed**.
- Реальный provider test: создан `gpt-live-1`, WebRTC подключён, sideband подключён,
  передана фиксированная синтетическая английская фраза, получены
  `session.started`, input/output transcript deltas, `session.closed`.
  Финальный usage: **15 seconds**. Не использовались реальные голоса/данные клиентов.
- TypeScript, ESLint, security-check (включая 6 self-tests), production build — PASS.
- Проверены 113 файлов client JS: значение пилотного ключа не обнаружено.
- `npm audit fix`: устранены обнаруженные зависимости; audit сообщил 0 vulnerabilities.
- Локальная страница входа открывается. RU→EN→RU проверено в браузере,
  `/login?next=/admin/assistant` сохраняется. Auth показывает отсутствие Supabase
  config; это не проверка авторизованного голосового окна.
- Первоначальный live-запрос вернул 400 invalid_type для server-event selectors;
  исправлено по официальной схеме, затем реальный тест прошёл. Модель не заменялась.

| Требуемый E2E | Статус |
|---|---|
| 1. Речь → голосовой ответ | Провайдер: PASS на синтетической речи; UI аккаунтов ещё не проверен |
| 2. Перебивание | Full-duplex transport реализован; живой акустический тест не выполнен |
| 3. Естественные паузы | Нет turn-VAD или искусственного response.create; требуется слуховая оценка |
| 4–6. Tool, долгая задача, возврат | Серверные интеграционные тесты PASS с тестовыми зависимостями; реальный authenticated E2E остаётся |
| 7. Контекст/память | Bounded history и tool bridge проверены в тестах; реальные аккаунты ещё не проверены |
| 8. История | Идемпотентное сохранение в общей таблице проверено с тестовой БД-зависимостью; real DB E2E остаётся |
| 9. Потеря сети | Две попытки создания новой сессии реализованы; реальный сетевой E2E не выполнен |
| 10. Секреты | Проверка client bundle PASS; ключ существует только server-side |

## F. Benchmark

Регрессия включает существующий synthetic development benchmark: 3 документа,
4 страницы, 100% critical numeric match / verified precision, zero critical false
VERIFIED. Pipeline извлечения не менялся. Это не клиническая валидация.

## G. Security / PHI

Все новые generative paths наследуют политику; tools повторно проверяют права.
Аудио не записывается; `store:false`; в аудит не попадают transcript, raw audio,
API key или tool arguments. Аудит содержит старт/конец, коды ошибок, длительность
делегации, первую выходную расшифровку, usage и оценку стоимости.
Существующие PHI/clinical approval gates не менялись. Открытие пилота широкой
аудитории не разрешено. CI workflow добавлен, но удалённый запуск и branch protection
не проверены. Нельзя заявлять production enforcement до этой проверки.

## H/I. Ограничения / Cost and lifecycle

Официальная цена на дату проверки — **$0.05/minute**, посекундно.
Инициализация WebRTC учитывает 15 секунд с зачётом в работающую сессию, не добавляет
ещё 15 секунд. Реальный smoke test: $0.0125 за Live; синтетический TTS отдельно.
Бэкенд, поиск, reasoning-модели оплачиваются отдельно; объединённый биллинг пока
не реализован. UI показывает длительность и оценку voice cost, final usage при
подтверждённом закрытии. После неполного отключения стоимость остаётся оценкой.

Default pilot: максимум 240 секунд/сессию, 6 сессий/день на аккаунт, общие атомарные
voice quotas; до 12 делегаций/сессию. Это не универсальный лимит OpenAI.
Pause закрывает платное соединение; продолжение создаёт новую сессию из общей
истории. Reconnect тоже создаёт новую сессию, не обещает восстановить потерянное
аудио. Долгие задачи вне времени жизни server function не являются durable jobs.
Нет отдельных audio PCM buffers в браузере: WebRTC согласует медиакодек.
Добавленные в main клиентские cabinet action tools сохраняют прежний workflow.
Они намеренно не выдаются Live-бэкенду: их подтверждение требует завершённой
следующей реплики, которой нет в схеме Live. Для этих записей остаётся существующий
кабинет; расширение Live потребует отдельного надёжного confirmation UI. Память
и read tools работают по описанному выше bridge.
Backchannel и перебивания определяются Live и инструкциями, качество требует
проверки пользователями. Эмоции/сознание не симулируются.

## J/K/L. Решение

**Phase NOT CLOSED. NO-GO для общего production rollout.** Код готов к review;
для включения закрытого пилота нужны подтверждение конкретной публикации,
серверный ключ/allowlist существующего Vercel-проекта и authenticated E2E.
Ключ OpenAI работает, модель доступна; отдельное ограничение account access не
обнаружено. Квоты для нагрузки трёх людей ещё не измерялись.

English: implemented in the existing application; real provider connectivity
passed. Production unchanged. Shared memory/backend integration has automated
coverage, but authenticated user, interruption and recovery acceptance remain.

## Official sources

- https://developers.openai.com/api/docs/models/gpt-live-1
- https://developers.openai.com/api/docs/guides/live
- https://developers.openai.com/api/docs/guides/live-delegation
- https://developers.openai.com/api/docs/guides/live-conversations
- https://developers.openai.com/api/docs/guides/voice-webrtc?api=live
- https://developers.openai.com/api/docs/guides/voice-server-controls?api=live
- https://developers.openai.com/api/docs/guides/voice-latency-cost?api=live
- Installed official OpenAI SDK 7.15.0 `resources/live/live.d.ts` (event contracts).
