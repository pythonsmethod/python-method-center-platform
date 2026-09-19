import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { LogoutButton } from "@/components/LogoutButton";
import { AnhamAvatar } from "@/components/assistant/AnhamAvatar";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { KnowledgePanel } from "@/components/assistant/KnowledgePanel";
import { listKnowledgeEntries } from "@/lib/assistant/knowledge";
import { getStaffUnreadCounts } from "@/lib/messages/queries";
import { getStaffCases } from "@/lib/cases/staff-queries";
import { countryFlag } from "@/lib/profile/identity";
import { ClientAvatar } from "@/components/cabinet/ClientAvatar";
import { createProfileAvatarUrlMap } from "@/lib/profile/avatar";
import { hasAssistantEnv } from "@/lib/assistant/router";
import { canSeeProviderNames, isFounderEmail } from "@/lib/auth/require-founder";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";
import { getLocale } from "@/lib/i18n/locale";

export default async function AdminPage() {
  const auth = await getRequiredStaffUser("/admin");
  const locale = await getLocale();

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Рабочее место команды"
          title="Админ-панель"
          description="Для доступа требуется настроенная аутентификация."
        />

        <AuthSetupNotice title="Админ-панель требует настройки Supabase Auth" />
      </div>
    );
  }

  if (auth.status === "forbidden") {
    notFound();
  }

  if (auth.status === "error") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Рабочее место команды"
          title="Админ-панель"
          description="Не удалось проверить доступ."
        />

        <div className="notice notice--warning">
          <span className="panel__label">Ошибка доступа</span>
          <h2>Админ-панель недоступна</h2>
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

  const [knowledge, unread, casesResult] = await Promise.all([
    listKnowledgeEntries(),
    getStaffUnreadCounts(auth.email),
    getStaffCases()
  ]);
  // The queue: the most recently updated cases, each opening in the focused
  // Today workspace (conversation and case assistant only).
  const queue = casesResult.status === "ready"
    ? [...casesResult.cases]
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(0, 8)
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
        title: "Админ-панель",
        description: "Слева — кейсы и обращения, справа — ИИ-помощник Professor Python.",
        sections: "Рабочие разделы",
        session: "Сессия",
        employee: "Сотрудник",
        role: "Роль",
        cases: "Кейсы",
        casesTitle: "Кейсы клиентов",
        unread: "нов.",
        casesText: "Анкеты онбординга, документы, история и материалы каждого кейса.",
        casesUnread: " Есть непрочитанные сообщения от клиентов.",
        openCases: "Открыть кейсы",
        documents: "Документы",
        documentsTitle: "Входящие документы",
        documentsText: "Все загруженные документы с открытием файла по защищённой ссылке.",
        openDocuments: "Открыть документы",
        requests: "Обращения",
        requestsTitle: "Сообщения клиентов",
        requestsText: "Вопросы из кабинета: контакты клиента и управление статусом.",
        openRequests: "Открыть обращения",
        queue: "Очередь на сегодня",
        queueHint: "Сначала показаны последние обновлённые кейсы.",
        allClients: "Все клиенты",
        open: "Открыть клиента",
        updated: "Обновлено",
        noCases: "Активных кейсов пока нет.",
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
        training: "Обучение ИИ",
        knowledgeTitle: "База знаний",
        knowledgeText: "Всё, что вы сохраните здесь, ИИ начнёт использовать в ответах: «ИИ клиентов» отвечает посетителям на сайте, «ИИ Professor Python» — вам в этом чате.",
        logout: "Выйти"
      }
    : {
        eyebrow: "Team workspace",
        title: "Admin panel",
        description: "Cases and requests on the left, the Professor Python AI assistant on the right.",
        sections: "Work sections",
        session: "Session",
        employee: "Team member",
        role: "Role",
        cases: "Cases",
        casesTitle: "Client cases",
        unread: "new",
        casesText: "Onboarding questionnaires, documents, history and materials of every case.",
        casesUnread: " There are unread messages from clients.",
        openCases: "Open cases",
        documents: "Documents",
        documentsTitle: "Incoming documents",
        documentsText: "Every uploaded document, opened through a protected link.",
        openDocuments: "Open documents",
        requests: "Requests",
        requestsTitle: "Client messages",
        requestsText: "Questions from the cabinet: client contacts and status management.",
        openRequests: "Open requests",
        queue: "Today's queue",
        queueHint: "The most recently updated cases appear first.",
        allClients: "All clients",
        open: "Open client",
        updated: "Updated",
        noCases: "There are no active cases yet.",
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
        training: "AI training",
        knowledgeTitle: "Knowledge base",
        knowledgeText: "Everything you save here the AI starts using in its answers: the client AI answers visitors on the site, the Professor Python AI answers you in this chat.",
        logout: "Sign out"
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

      <div className="admin-split">
        <section aria-label={copy.sections} className="admin-split__work">
          <div className="panel">
            <span className="panel__label">{copy.session}</span>
            <h2>{auth.email ?? copy.employee}</h2>
            <p>{copy.role}: {auth.role}</p>
            <div className="panel-actions">
              <LogoutButton label={copy.logout} />
            </div>
          </div>
          <div className="panel">
            <span className="panel__label">{copy.cases}</span>
            <h2>
              {copy.casesTitle}
              {unread.total > 0 ? (
                <span className="unread-badge unread-badge--inline">
                  {unread.total} {copy.unread}
                </span>
              ) : null}
            </h2>
            <p>
              {copy.casesText}
              {unread.total > 0 ? copy.casesUnread : ""}
            </p>
            <div className="panel-actions">
              <Link className="button button--secondary" href="/admin/cases">
                {copy.openCases}
              </Link>
            </div>
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
                      <small>{copy.updated}: {dateFormatter.format(new Date(clientCase.updated_at))}</small>
                    </span>
                    <span className="karen-client-card__arrow" aria-label={copy.open}>›</span>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="panel">
            <span className="panel__label">{copy.documents}</span>
            <h2>{copy.documentsTitle}</h2>
            <p>{copy.documentsText}</p>
            <div className="panel-actions">
              <Link className="button button--secondary" href="/admin/documents">
                {copy.openDocuments}
              </Link>
            </div>
          </div>
          <div className="panel">
            <span className="panel__label">{copy.requests}</span>
            <h2>{copy.requestsTitle}</h2>
            <p>{copy.requestsText}</p>
            <div className="panel-actions">
              <Link className="button button--secondary" href="/admin/requests">
                {copy.openRequests}
              </Link>
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

          <div className="panel">
            <span className="panel__label">{copy.training}</span>
            <h2>{copy.knowledgeTitle}</h2>
            <p>{copy.knowledgeText}</p>
            <KnowledgePanel entries={knowledge.entries} loadError={knowledge.error} locale={locale} />
          </div>
        </section>
      </div>
    </div>
  );
}
