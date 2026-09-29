import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { AnhamAvatar } from "@/components/assistant/AnhamAvatar";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { getStaffUnreadCounts } from "@/lib/messages/queries";
import { getKarenTodayActivity, getStaffCases } from "@/lib/cases/staff-queries";
import { countryFlag } from "@/lib/profile/identity";
import { ClientAvatar } from "@/components/cabinet/ClientAvatar";
import { createProfileAvatarUrlMap } from "@/lib/profile/avatar";
import { hasAssistantEnv } from "@/lib/assistant/router";
import { canSeeProviderNames, isFounderEmail } from "@/lib/auth/require-founder";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

const KAREN_TIME_ZONE = "America/Los_Angeles";

function karenDayBounds(now = new Date()): { start: string; end: string } {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KAREN_TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(now);
  const datePart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(dateParts.find((part) => part.type === type)?.value);
  const year = datePart("year");
  const month = datePart("month");
  const day = datePart("day");
  const midnight = (y: number, m: number, d: number) => {
    const guess = Date.UTC(y, m - 1, d);
    const zoned = new Intl.DateTimeFormat("en-CA", {
      timeZone: KAREN_TIME_ZONE,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date(guess));
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      Number(zoned.find((part) => part.type === type)?.value);
    const represented = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
    return new Date(guess - (represented - guess)).toISOString();
  };
  return { start: midnight(year, month, day), end: midnight(year, month, day + 1) };
}

export default async function AdminPage() {
  const auth = await getRequiredStaffUser("/admin");
  const locale = await getLocale();

  const ru = locale === "ru";
  const shell = ru
    ? { eyebrow: "Рабочее место команды", title: "Админ-панель", setupText: "Для доступа требуется настроенная аутентификация.", setupTitle: "Админ-панель требует настройки Supabase Auth", errorText: "Не удалось проверить доступ.", errorLabel: "Ошибка доступа", errorTitle: "Админ-панель недоступна" }
    : { eyebrow: "Team workspace", title: "Admin panel", setupText: "Access requires authentication to be configured.", setupTitle: "The admin panel needs Supabase Auth to be configured", errorText: "Access could not be verified.", errorLabel: "Access error", errorTitle: "The admin panel is unavailable" };

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader eyebrow={shell.eyebrow} title={shell.title} description={shell.setupText} />

        <AuthSetupNotice labels={getDictionary(locale).setup} title={shell.setupTitle} />
      </div>
    );
  }

  if (auth.status === "forbidden") {
    notFound();
  }

  if (auth.status === "error") {
    return (
      <div className="page-shell">
        <PageHeader eyebrow={shell.eyebrow} title={shell.title} description={shell.errorText} />

        <div className="notice notice--warning">
          <span className="panel__label">{shell.errorLabel}</span>
          <h2>{shell.errorTitle}</h2>
          <p>{auth.message}</p>
        </div>
      </div>
    );
  }

  // /admin is Karen's operational workspace. The founder has a separate
  // overview and should never be presented with Karen's personal cabinet.
  if (auth.role === "admin" && isFounderEmail(auth.email)) {
    redirect("/admin/founder");
  }

  const day = karenDayBounds();
  const [unread, casesResult, todayActivity] = await Promise.all([
    getStaffUnreadCounts(auth.email, day.start),
    getStaffCases(),
    getKarenTodayActivity(day.start, day.end)
  ]);
  const queue = casesResult.status === "ready"
    ? [...casesResult.cases]
        .filter((clientCase) => todayActivity.caseIds.includes(clientCase.id))
        .sort((a, b) =>
          (todayActivity.latestAtByCase[b.id] ?? "").localeCompare(
            todayActivity.latestAtByCase[a.id] ?? ""
          ) || a.id.localeCompare(b.id)
        )
    : [];
  const avatarUrls = await createProfileAvatarUrlMap(
    queue.map((clientCase) => clientCase.profiles?.avatar_path)
  );
  const dateFormatter = new Intl.DateTimeFormat(locale === "ru" ? "ru" : "en", {
    dateStyle: "short",
    timeStyle: "short"
  });
  const assistantConfigured = hasAssistantEnv() || Boolean(process.env.OPENAI_REALTIME_API_KEY?.trim());
  // Only the founder sees which model answers; for the team it is simply
  // the assistant.
  const showProviders = canSeeProviderNames(auth.email);
  const copy = locale === "ru"
    ? {
        eyebrow: "Рабочее место команды",
        title: "Сегодня",
        description: "Только сегодняшняя работа с клиентами.",
        unread: "нов.",
        queue: "Очередь на сегодня",
        queueHint: "Только клиенты, у которых сегодня были сообщения, документы или другие события.",
        allClients: "Все клиенты",
        open: "Открыть клиента",
        updated: "Обновлено",
        noCases: "Сегодня по клиентам пока ничего не произошло.",
        caseFallback: "Материалы кейса",
        assistant: "ИИ-помощник Professor Python",
        assistantTitle: "Рабочий чат",
        assistantIntro: "Здравствуйте, Professor Python! Вставьте вопрос клиента, текст анкеты или задачу — помогу с черновиком ответа, выжимкой или планом. Можно прикрепить до 30 фото или PDF за раз (скрепка внизу): снимки сжимаются сами, а если файлов много — я прочитаю их по частям и соберу общий разбор. Файлы нигде не сохраняются.",
        assistantPlaceholder: "Вставьте вопрос или прикрепите файл…",
        assistantSuggestions: [
          "Разбери приложенные анализы по методу",
          "Составь черновик ответа клиенту",
          "Сделай выжимку анкеты",
          "Помоги сформулировать знание для ИИ клиентов"
        ],
        assistantMissingFounder: "ИИ-помощник ещё не подключён: добавьте в Vercel переменную окружения ANTHROPIC_API_KEY (Claude) и/или OPENAI_API_KEY (GPT) и сделайте Redeploy.",
        assistantMissing: "ИИ-помощник ещё не подключён. Напишите основателю — это настройка платформы.",
        todayMessages: "Новых сообщений сегодня"
      }
    : {
        eyebrow: "Team workspace",
        title: "Today",
        description: "Only today's client work.",
        unread: "new",
        queue: "Today's queue",
        queueHint: "Only clients with messages, documents, or other activity today.",
        allClients: "All clients",
        open: "Open client",
        updated: "Updated",
        noCases: "Nothing has happened with clients today yet.",
        caseFallback: "Case materials",
        assistant: "Professor Python AI assistant",
        assistantTitle: "Work chat",
        assistantIntro: "Hello, Professor Python! Paste a client's question, questionnaire text or a task — I will help with a draft reply, a summary or a plan. You can attach up to 30 photos or PDFs at once (the paperclip below): images are compressed automatically, and if there are many files I read them in parts and assemble one overall review. Files are never stored.",
        assistantPlaceholder: "Paste a question or attach a file…",
        assistantSuggestions: [
          "Review the attached results by the method",
          "Draft a reply to the client",
          "Summarize the questionnaire",
          "Help me phrase a knowledge entry for the client AI"
        ],
        assistantMissingFounder: "The AI assistant is not connected yet: add the ANTHROPIC_API_KEY (Claude) and/or OPENAI_API_KEY (GPT) environment variable in Vercel and redeploy.",
        assistantMissing: "The AI assistant is not connected yet. Contact the founder — this is a platform setting.",
        todayMessages: "New messages today"
      };

  // One page for every screen. Phones used to get a separate "Today" page
  // without the session panel and the knowledge base, so the team could not
  // teach the assistant or sign out from a phone; the queue that page had is
  // now part of this one.
  return (
    <div className="page-shell page-shell--wide">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />

      <div className="admin-split karen-today-workspace">
        <section aria-label={copy.queue} className="admin-split__work">
          <div className="panel karen-today-summary">
            <span className="panel__label">{copy.todayMessages}</span>
            <strong>{unread.total}</strong>
          </div>
          <div className="panel karen-queue">
            <div className="karen-queue__head">
              <div>
                <span className="panel__label">{copy.queue}</span>
                <p>{copy.queueHint}</p>
              </div>
              <Link href="/admin/cases">{copy.allClients} →</Link>
            </div>
            <div className="karen-queue__list">
              {queue.length === 0 ? <p className="empty-state">{copy.noCases}</p> : queue.map((clientCase) => {
                const unreadCount = unread.byCase[clientCase.id] ?? 0;
                return (
                  <Link className="karen-client-card" href={`/admin/cases/${clientCase.id}?view=today`} key={clientCase.id}>
                    <ClientAvatar
                      className="karen-client-card__avatar"
                      name={clientCase.profiles?.full_name ?? clientCase.profiles?.email ?? "?"}
                      url={clientCase.profiles?.avatar_path ? avatarUrls[clientCase.profiles.avatar_path] : null}
                    />
                    <span className="karen-client-card__content">
                      <span className="karen-client-card__topline">
                        <strong>
                          {clientCase.profiles?.full_name ?? clientCase.profiles?.email ?? "—"}
                          {clientCase.case_number ? ` · ${clientCase.case_number}` : ""}
                          {clientCase.profiles?.country_code ? ` · ${countryFlag(clientCase.profiles.country_code)}` : ""}
                        </strong>
                        {unreadCount > 0 ? <b>{unreadCount} {copy.unread}</b> : null}
                      </span>
                      <span>{clientCase.title ?? copy.caseFallback}</span>
                      <small>{copy.updated}: {dateFormatter.format(new Date(todayActivity.latestAtByCase[clientCase.id]))}</small>
                    </span>
                    <span className="karen-client-card__arrow" aria-label={copy.open}>›</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section aria-label={copy.assistant} className="admin-split__assistant" id="karen-assistant">
          <div className="panel">
            <span className="panel__label">{copy.assistant}</span>
            <h2 className="staff-assistant__title">
              <AnhamAvatar className="staff-assistant__face" size={44} state="client" />
              {copy.assistantTitle}
            </h2>
            {assistantConfigured ? (
              <AssistantChat
                attachments
                endpoint="/api/assistant/staff"
                locale={locale}
                intro={copy.assistantIntro}
                placeholder={copy.assistantPlaceholder}
                providerChoice={showProviders}
                suggestions={copy.assistantSuggestions}
              />
            ) : (
              <p className="form-message form-message--error">
                {showProviders ? copy.assistantMissingFounder : copy.assistantMissing}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
