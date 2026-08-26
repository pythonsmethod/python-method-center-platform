# Полный аудит сайта: бриф для Cloud и базовая проверка Codex

Дата: 25 августа 2026 года  
Production: https://pythonmethodcenter.com  
Репозиторий: `pythonsmethod/python-method-center-platform`

## Бриф для Cloud

Проведи полный независимый аудит сайта Python Method Center и его текущей кодовой базы. Работай только в репозитории `pythonsmethod/python-method-center-platform`. Никогда не открывай, не клонируй, не подключай и не используй архивный репозиторий `pythonsmethod/python-method-center`.

Это диагностическая проверка: сначала ничего не исправляй и не меняй. Нужен доказательный отчёт о том, что действительно работает, что сломано, что реализовано частично, что разработано в коде, но не подключено в production, и что отсутствует.

Проверь production-сайт `https://pythonmethodcenter.com` и актуальную ветку репозитория. Если состояние production отличается от кода, явно зафиксируй расхождение и укажи commit/deployment, если это возможно установить.

Обязательный охват:

1. Запусти `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Приведи точные результаты и ошибки.
2. Составь карту всех страниц, API routes, server actions, интеграций, таблиц Supabase, storage buckets, ролей и feature flags.
3. Проверь публичные страницы, регистрацию, вход, восстановление пароля, onboarding, кабинет клиента, документы, сообщения, голосовые сообщения, поддержку, показатели, добавки, сон, токены/referrals, шахматы с Anham, оплату, success/error states, админку и founder dashboard.
4. Проверь цепочки целиком: UI → запрос/action → API → Supabase/Stripe/AI/Telegram → ответ → UI. Не считать функцию рабочей только потому, что её код существует.
5. Проверь роли guest, registered, paid client, support, admin и founder. Убедись, что чужие данные недоступны, прямые URL защищены, API закрыты серверной авторизацией, RLS не обходится клиентом.
6. Проверь русский и английский варианты каждой изменяемой/видимой страницы: текст, title, metadata, aria-label, placeholder, validation, empty/error/success states. Не допускай смешения языков. Переключатель языка должен сохранять текущий маршрут и менять весь экран в обе стороны.
7. Проверь desktop 1440×900, tablet 768×1024, mobile 390×844 и 320×568. Ищи горизонтальный scroll, обрезание, наложения, слишком мелкие зоны нажатия, неправильный порядок блоков, прыжки layout и проблемы клавиатуры/форм.
8. Проверь каждое raster/SVG изображение: загрузка, aspect ratio, `object-fit`, responsive sizing, отсутствие растяжения/обрезания лица или текста, качество на retina, alt-текст и вес файла. Сделай скриншоты каждого дефекта.
9. Проверь console errors/warnings, failed network requests, HTTP status, redirects, cookies, caching, hydration, error boundaries, 404, robots.txt, sitemap.xml, canonical, hreflang, Open Graph, manifest и favicon.
10. Проверь Stripe links/webhook/idempotency, PayPal/альтернативную оплату, Supabase Auth/DB/Storage, Anthropic/OpenAI routing, Telegram alerts, email flows, App Store/Google Play links и все env-dependent функции. Не раскрывай значения секретов; сообщай только наличие и работоспособность.
11. Найди код, миграции, компоненты, страницы и настройки, которые созданы, но не имеют входа из UI, не задеплоены, не настроены или не вызываются. Отдельно найди UI, который обещает функцию, которой пока нет.
12. Проверь даты, цены, юридические тексты, обещания о бесплатной оценке, emergency copy и согласованность фактического поведения с privacy/offer/refund документами.
13. Оцени доступность (keyboard, focus, labels, headings, contrast, reduced motion), безопасность, privacy, rate limits, observability, backup/recovery и готовность к реальному клиентскому трафику.

Для каждой проблемы дай:

- ID и краткое название;
- приоритет P0/P1/P2/P3;
- route, locale, viewport, роль;
- точные шаги воспроизведения;
- ожидаемый и фактический результат;
- доказательство: screenshot/log/request/code location;
- вероятную первопричину;
- конкретную рекомендацию исправления;
- оценку риска регрессии и необходимые тесты.

Отчёт закончи разделами:

- Executive summary и launch verdict: GO / GO WITH CONDITIONS / NO-GO;
- подтверждённо работает;
- подтверждённо сломано;
- реализовано, но не подключено/не настроено;
- отсутствует, хотя ожидается;
- продуктовые и UX-рекомендации;
- безопасность/данные/наблюдаемость;
- приоритетный план: сегодня, 7 дней, 30 дней;
- список вопросов владельцу;
- таблица покрытия, где каждое утверждение имеет статус Verified / Failed / Not testable и доказательство.

Не выдавай предположение за факт. Если для проверки нужны тестовые аккаунты, Stripe test mode, доступ к Vercel/Supabase/Telegram или реальные env, пометь блок как `Not testable`, перечисли точный доступ и сценарий, который нужен. Не совершай реальные платежи, не отправляй сообщения реальным людям и не изменяй production-данные.

## Базовая проверка Codex

### Подтверждено

- `npm run lint` — пройден без предупреждений.
- `npm run typecheck` — пройден.
- `npm test` — 78 test files, 574 tests, все пройдены.
- `npm run build` — production build пройден, сформированы 59 страниц/API-маршрутов.
- В браузере проверены 17 публичных маршрутов на desktop 1440×1000 и mobile 390×844 в RU и EN: всего 68 комбинаций страниц плюс четыре проверки переключателя.
- Переключатель RU/EN на `/professor` сохраняет маршрут и корректно меняет `html[lang]` в обе стороны на desktop и mobile.
- На проверенных публичных страницах нет битых изображений и console errors.
- Анонимный доступ к кабинету, onboarding и admin-разделам перенаправляется на `/login`.
- Production отдает осмысленный EN и RU контент; массового смешения кириллицы в английских экранах не найдено.

### Найдено

1. **P1 — горизонтальное переполнение мобильной RU-страницы `/review`.** При viewport 390×844 фактическая ширина документа составила 443 px при client width 375 px. На desktop и на EN-варианте в том же прогоне дефект не проявился. Нужно локализовать CSS/pseudo-element/анимацию, сделать screenshot в крайних фазах анимации и добавить regression test на `scrollWidth <= clientWidth`.
2. **P2 — после входа теряется точный вложенный маршрут.** Анонимные `/cabinet/documents`, `/cabinet/metrics`, `/cabinet/chess` и другие ведут на `login?next=/cabinet`; вложенные admin routes — на `login?next=/admin`. Если пользователь ожидал вернуться на конкретный экран, это ухудшает continuity. Нужно подтвердить продуктовый замысел; при необходимости сохранять исходный safe relative path.
3. **P2 — mobile app показан как “Coming soon”.** В коде предусмотрены `NEXT_PUBLIC_APP_STORE_URL` и `NEXT_PUBLIC_GOOGLE_PLAY_URL`, но production показывает неактивные badges. Это реализованная точка подключения без опубликованных ссылок/релиза.
4. **P2 — ограничения, прямо указанные в README:** содержимое файлов из cabinet storage не читается AI автоматически; staff assistant history не сохраняется; README всё ещё утверждает, что admin UI Russian-only, что конфликтует с обязательным bilingual quality gate и требует отдельной полной проверки.
5. **P2 — устаревший `PROJECT_RESET_STATUS.md`.** Документ утверждает, что база, business logic, agents и Telegram отсутствуют, хотя текущий проект всё это содержит. Это опасный источник ложной информации для Cloud/новых разработчиков.
6. **P3 — крупные исходные raster assets.** `anham-master.png` около 1.70 MB, `professor-python.png` около 0.90 MB. Next Image оптимизирует выдачу, но origin/build/deployment и редкие неоптимизированные сценарии стоит проверить; сохранить визуальное качество после возможной перекодировки в WebP/AVIF.

### Реализовано в коде и требует подтверждения production-конфигурации

- Supabase Auth, Postgres/RLS, private storage и 23 миграции.
- Stripe Payment Links и два совместимых webhook URL.
- PayPal/alternative payment configuration.
- Anthropic + OpenAI routing и arbiter.
- Telegram red-flag/operations notifications и founder health panel.
- Document automatic processing, metrics/supplements extraction.
- Referral/token system, shop waitlist, sleep tracker, chess memory/discussion.
- App Store/Google Play URLs.

Наличие кода не подтверждает, что env, webhook, buckets, migrations и external dashboards настроены в production. Это ключевая часть независимой проверки Cloud.

### Что не проверено без безопасных тестовых доступов

- Реальная регистрация/email confirmation/recovery и authenticated RU/EN states.
- Роли paid/support/admin/founder и cross-account authorization.
- Запись/чтение реальных данных Supabase и применённость всех миграций/RLS.
- Stripe test checkout/webhook/refund/failure/idempotency.
- Telegram delivery, AI provider failover/limits, document and audio processing.
- Реальная отправка support/onboarding/payment forms.

### Предварительное продуктовое видение

1. Добавить один наблюдаемый “client journey” dashboard: следующий шаг, ожидаемые ответы, документы, срок программы и последние действия.
2. Ввести production smoke suite после каждого deploy: RU/EN, mobile/desktop, auth redirects, critical APIs, broken images, horizontal overflow.
3. Добавить Sentry/structured logs/correlation IDs и health dashboard по Supabase, Stripe, AI, Telegram, document processing и email.
4. Сделать честную capability matrix: доступно сейчас / beta / скоро; не показывать элементы как активные до реального подключения.
5. Усилить доверие: понятные сроки ответа, кто отвечает (Professor/Karen/Anham), статус заявки/документа и журнал согласий.
6. Провести отдельный accessibility и medical-safety review, включая keyboard-only, screen readers, reduced motion, emergency escalation и границы AI.
7. Удалить или обновить устаревшие status-документы и завести единый живой launch-readiness checklist.

## Сверка с независимым аудитом Cloud

Источник: Claude Code artifact `dd0ae04c-c73a-483c-80f0-49a7f4814852`, 25 августа 2026 года.

Cloud проверял commit `4391b36`, production deployment `dpl_35a25ABp` со статусом READY и production Supabase в read-only режиме. Его итог: **GO WITH CONDITIONS**. Публичный сайт пригоден к показу, но платный трафик нельзя запускать до закрытия денежной цепочки и основных дефектов воронки.

### Полностью совпавшие выводы

- Mobile RU `/review` имеет горизонтальное переполнение. Cloud локализовал причину точнее: длинное слово «предварительная» в `.hero h1` при `overflow-wrap: normal`. Проверенный вариант исправления — `overflow-wrap: anywhere`.
- После входа теряется точный вложенный маршрут: `/cabinet/documents` становится `next=/cabinet`, admin routes — `next=/admin`.
- App Store и Google Play предусмотрены кодом, но не подключены.
- PayPal/альтернативная оплата предусмотрены кодом, но production-конфигурация отсутствует.
- AI не читает содержимое файлов, ранее загруженных в кабинет; staff assistant history не сохраняется.
- `PROJECT_RESET_STATUS.md` опасно устарел и противоречит production.
- Нужны post-deploy smoke tests, наблюдаемость, health dashboard, единый экран пути клиента и честная матрица возможностей.

### Новые критические факты Cloud

1. **P0 — платежи тарифа не записываются автоматически.** В production нет ни одной записи `support_5_weeks` или `support_15_weeks` в `payments`. Зафиксированы семь успешных Stripe-сессий и три `payment_unmatched`; последняя — 24 августа. Риск: деньги получены, но период сопровождения и платный AI не активируются.
2. **P1 — ошибки EN-форм возвращаются по-русски.** Подтверждено на signup и support; тот же архитектурный дефект найден в recovery и публичном AI guard. Это прямое нарушение bilingual quality gate.
3. **P1 — приветствие Anham перекрывает мобильную регистрацию.** На 390×844 окно занимает почти половину экрана и закрывает поля формы через 1,4 секунды после первого входа.
4. **P1 — промо не выключится после 1 сентября автоматически.** `isFreeReviewActive()` проверяет только env-флаг, но не дату. Без ручного изменения production продолжит показывать истёкшее обещание.
5. **P2 security — потенциальная открытая переадресация.** `sanitizeNextPath()` пропускает обратный слэш; `new URL("/\\evil.com", origin)` нормализует адрес во внешний домен. Нужна одна строгая общая функция и security tests.
6. **P2 security — `/api/documents/process` принимает публичный Supabase anon key как секрет планировщика.** Его нельзя считать секретом; нужен отдельный server-only cron secret или Vercel Cron authentication.
7. **P2 — оплаченный доступ не заканчивается.** Cloud сообщает, что четыре из четырёх `service_periods` остаются `active` при истёкшем `ends_at`.
8. **P2 — очередь документов не обслуживается надёжно.** Три задачи имеют статус failed с 18 августа; cron и retry-механизм отсутствуют.
9. **P2 privacy — `public/images/professor/mother.jpg` остаётся доступным напрямую**, хотя фотография больше не используется интерфейсом. Владелец должен решить: удалить или осознанно вернуть.
10. **P2 — production schema существует, но migration registry расходится с репозиторием:** три зарегистрированные миграции против 24 файлов. Это повышает риск неповторяемого восстановления и следующего deploy.
11. **P2 SEO — RU и EN находятся на одинаковых URL, `hreflang` и `og:image` отсутствуют.** Английская версия практически не существует как отдельная поисковая сущность.
12. **P2/P3 metadata — `/support` и auth-экраны используют общий title главной; favicon весит около 1,62 MB.**
13. **P3 accessibility — кнопка закрытия приветствия Anham около 19×23 px, а ошибки форм не объявляются через `role=alert`/live region.**
14. **Operational gap — все 22 production-кейса имеют `ready_for_review`; ни один не прошёл полный lifecycle.** Требуется выяснить, реальные ли это клиенты, тестовые записи или непроставленные статусы.

### Что Cloud подтвердил работающим

- Production соответствует commit `4391b36`, deployment READY.
- 574 теста и четыре инженерные проверки зелёные.
- Supabase ACTIVE_HEALTHY; RLS ограничивает клиента его данными; storage buckets приватные.
- Stripe webhook получает события и реализует insert-first idempotency, хотя дальнейшая привязка платежа сломана.
- Telegram реально доставляет уведомления: 38 sent, один skipped.
- Платёжные Stripe links присутствуют в production HTML.
- Публичная статика RU/EN, изображения, console/runtime, robots, sitemap, canonical и security headers в основном исправны.
- Цены 1 440 и 3 675 USD согласованы между конфигурацией, страницей оплаты и юридическими текстами.

## Объединённый приоритет действий

### Немедленно, до платного трафика

1. Разобрать три `payment_unmatched` в Stripe и вручную проверить, получили ли клиенты доступ.
2. Переделать привязку тарифа на Stripe metadata + `client_reference_id`; сумму использовать только как проверку.
3. Закрыть `/api/documents/process` отдельным server-only секретом.
4. Решить судьбу промо до 1 сентября и добавить автоматическую проверку даты.
5. Исправить EN validation/error messages в auth, recovery, support и AI guard.
6. Убрать автоматическое приветствие Anham с экранов форм либо показывать его без перекрытия элементов.
7. Исправить mobile overflow `/review` и добавить автоматический тест `scrollWidth <= clientWidth`.

### Затем, в течение семи дней

1. Закрыть open redirect и объединить три реализации `sanitizeNextPath()`.
2. Сохранять точный безопасный вложенный маршрут после входа.
3. Добавить cron, retries и админскую очередь для document processing.
4. Автоматически завершать истёкшие service periods и вычислять доступ по датам, а не только по статусу.
5. Добавить очередь непривязанных платежей и других событий `requires attention` в admin.
6. Исправить metadata, favicon, touch targets и live announcements ошибок.
7. Обновить `PROJECT_RESET_STATUS.md` и зафиксировать реальное состояние миграций.

### Решения, требуемые от владельца

- Были ли три непривязанных платежа обработаны вручную и получили ли люди доступ?
- Продлевается ли бесплатная оценка после 1 сентября 2026 года?
- Английская версия — полноценный рынок или только витрина?
- 22 `ready_for_review` — реальные клиенты, тестовые записи или незакрытые рабочие кейсы?
- Нужны ли сейчас PayPal/alternative payment, и когда выйдут мобильные приложения?
- Удаляем `mother.jpg` или возвращаем её в интерфейс осознанно?
- Админка должна стать полностью двуязычной согласно `AGENTS.md` или остаётся внутренней Russian-only системой?
