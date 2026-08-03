# Проверка мобильного приложения на реальном телефоне

## Цель

Увидеть и проверить Python Method Center на iPhone или Android до публикации в App Store и Google Play.

## Вариант A — Android без Google Play

1. Установить Node.js LTS и EAS CLI на рабочем компьютере.
2. Войти в Expo: `eas login`.
3. Перейти в папку `mobile`.
4. Создать внутреннюю сборку: `eas build --platform android --profile preview`.
5. После завершения открыть ссылку EAS Build на Android.
6. Разрешить установку APK из браузера и установить приложение.

Google Play для этого не нужен. Preview-профиль создаёт внутреннюю APK-сборку.

## Вариант B — iPhone с Apple Developer Program

1. Войти в Expo и подключить Apple Developer account.
2. Зарегистрировать iPhone для ad hoc distribution.
3. Выполнить: `eas build --platform ios --profile preview`.
4. Открыть ссылку EAS Build на зарегистрированном iPhone и установить приложение.
5. При необходимости включить Developer Mode в настройках iPhone.

App Store и TestFlight не нужны, но для облачной ad hoc-сборки нужен Apple Developer account.

## Вариант C — iPhone без платного Apple Developer account

Требуется Mac с Xcode и подключённый кабелем iPhone. Локальная development-сборка может быть подписана бесплатным Apple ID. Такая установка предназначена только для разработки и периодически требует повторной подписи.

## Запуск development-сервера

После установки development build:

```bash
cd mobile
npm install
cp .env.example .env
npm run start:tunnel
```

Открыть установленное приложение и выбрать найденный development server. Tunnel подходит, когда телефон и компьютер находятся в разных сетях или локальный Wi-Fi блокирует соединение.

## Обязательные переменные

В `mobile/.env` должны быть публичные значения того же Supabase-проекта, что использует сайт:

```text
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_BASE_URL=https://pythonmethodcenter.com
```

Нельзя помещать в мобильное приложение service-role key, Stripe secret, webhook secret или AI API keys.

## Первый smoke test

1. Войти аккаунтом, который уже существует на сайте.
2. Проверить профиль и кейс.
3. Сверить период сопровождения с веб-кабинетом.
4. Открыть список документов.
5. Загрузить PDF или фотографию с телефона.
6. Обновить веб-кабинет и убедиться, что файл появился там.
7. Загрузить файл через сайт и убедиться, что он появился в приложении.
8. Выйти и снова войти — сессия и данные должны восстановиться корректно.
