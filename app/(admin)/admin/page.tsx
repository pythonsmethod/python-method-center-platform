import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { LogoutButton } from "@/components/LogoutButton";
import { AnhamAvatar } from "@/components/assistant/AnhamAvatar";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { KnowledgePanel } from "@/components/assistant/KnowledgePanel";
import { EscalationPanel } from "@/components/escalations/EscalationPanel";
import { listKnowledgeEntries } from "@/lib/assistant/knowledge";
import { listOpenEscalations } from "@/lib/escalations/queries";
import { getStaffUnreadCounts } from "@/lib/messages/queries";
import { hasAssistantEnv } from "@/lib/assistant/router";
import { canSeeProviderNames } from "@/lib/auth/require-founder";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";
import { getLocale } from "@/lib/i18n/locale";
import { getStaffCases } from "@/lib/cases/staff-queries";

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

  const [knowledge, escalations, unread, casesResult] = await Promise.all([
    listKnowledgeEntries(),
    listOpenEscalations(),
    getStaffUnreadCounts(),
    getStaffCases()
  ]);
  const assistantConfigured = hasAssistantEnv();
  // Only the founder sees which model answers; for the team it is simply
  // the assistant.
  const showProviders = canSeeProviderNames(auth.email);
  const statusLabels = locale === "ru"
    ? {
        created: "Создан",
        awaiting_onboarding: "Ожидает анкету",
        ready_for_review: "Передан на изучение",
        in_review: "Изучается командой",
        active_support: "Активное сопровождение",
        inactive_support: "Сопровождение приостановлено",
        completed: "Завершён",
        archived: "В архиве"
      }
    : {
        created: "Created",
        awaiting_onboarding: "Awaiting questionnaire",
        ready_for_review: "Ready for review",
        in_review: "Under review",
        active_support: "Active support",
        inactive_support: "Support paused",
        completed: "Completed",
        archived: "Archived"
      };
  const urgencyLabels = locale === "ru"
    ? { normal: "Обычная", elevated: "Повышенная", critical: "Критическая" }
    : { normal: "Normal", elevated: "Elevated", critical: "Critical" };
  const label = (labels: Record<string, string>, value: string) =>
    labels[value] ?? value.replaceAll("_", " ");
  const dateFormatter = new Intl.DateTimeFormat(locale === "ru" ? "ru" : "en", {
    dateStyle: "short",
    timeStyle: "short"
  });
  const copy = locale === "ru"
    ? {
        eyebrow: "Рабочий кабинет Карена",
        title: "Сегодня",
        messages: "Новых сообщений",
        flags: "Красных флагов",
        clients: "Клиентов в работе",
        attention: "Требует внимания",
        queue: "Очередь на сегодня",
        queueHint: "Сначала показаны срочные кейсы и непрочитанные сообщения.",
        open: "Открыть клиента",
        waiting: "Обновлено",
        noCases: "Активных кейсов пока нет.",
        allClients: "Все клиенты",
        assistantTitle: "Рабочий помощник",
        assistantIntro: "Вставьте вопрос клиента, текст анкеты или прикрепите анализы — помогу сделать выжимку и подготовить ответ.",
        assistantPlaceholder: "Вопрос, текст или файл…",
        assistantUnavailable: "Помощник пока не подключён. Напишите администратору платформы.",
        assistantSuggestions: ["Сделай выжимку кейса", "Подготовь черновик ответа", "Разбери приложенные анализы"],
        unread: "нов."
      }
    : {
        eyebrow: "Karen's workspace",
        title: "Today",
        messages: "New messages",
        flags: "Red flags",
        clients: "Active clients",
        attention: "Needs attention",
        queue: "Today's queue",
        queueHint: "Urgent cases and unread messages appear first.",
        open: "Open client",
        waiting: "Updated",
        noCases: "There are no active cases yet.",
        allClients: "All clients",
        assistantTitle: "Work assistant",
        assistantIntro: "Paste a client's question or questionnaire, or attach test results — I can summarize them and draft a reply.",
        assistantPlaceholder: "Question, text or file…",
        assistantUnavailable: "The assistant is not connected yet. Contact the platform administrator.",
        assistantSuggestions: ["Summarize the case", "Draft a reply", "Review the attached results"],
        unread: "new"
      };
  const cases = casesResult.status === "ready"
    ? [...casesResult.cases]
        .sort((a, b) => {
          const urgency = (value: string) => value === "critical" ? 2 : value === "elevated" ? 1 : 0;
          const priorityA = urgency(a.urgency) * 1000 + (unread.byCase[a.id] ?? 0) * 100;
          const priorityB = urgency(b.urgency) * 1000 + (unread.byCase[b.id] ?? 0) * 100;
          return priorityB - priorityA || b.updated_at.localeCompare(a.updated_at);
        })
        .slice(0, 8)
    : [];

  return (
    <div className="page-shell page-shell--wide">
      <section className="karen-mobile-home" aria-labelledby="karen-today-title">
        <header className="karen-mobile-hero">
          <span>{copy.eyebrow}</span>
          <h1 id="karen-today-title">{copy.title}</h1>
        </header>

        <div className="karen-mobile-stats" aria-label={copy.title}>
          <Link href="/admin/cases">
            <b>{unread.total}</b>
            <span>{copy.messages}</span>
          </Link>
          <a href="#karen-flags">
            <b>{escalations.escalations.length}</b>
            <span>{copy.flags}</span>
          </a>
          <Link href="/admin/cases">
            <b>{casesResult.status === "ready" ? casesResult.cases.length : "—"}</b>
            <span>{copy.clients}</span>
          </Link>
        </div>

        {(escalations.escalations.length > 0 || escalations.error) ? (
          <div className="karen-mobile-alert" id="karen-flags">
            <span className="panel__label">{copy.attention}</span>
            <EscalationPanel escalations={escalations.escalations} loadError={escalations.error} />
          </div>
        ) : null}

        <div className="karen-mobile-section-head">
          <div>
            <span className="panel__label">{copy.queue}</span>
            <p>{copy.queueHint}</p>
          </div>
          <Link href="/admin/cases">{copy.allClients} →</Link>
        </div>

        <div className="karen-mobile-queue">
          {cases.length === 0 ? <p className="empty-state">{copy.noCases}</p> : cases.map((clientCase) => {
            const unreadCount = unread.byCase[clientCase.id] ?? 0;
            return (
              <Link className="karen-client-card" href={`/admin/cases/${clientCase.id}`} key={clientCase.id}>
                <span className="karen-client-card__avatar" aria-hidden="true">
                  {(clientCase.profiles?.full_name ?? clientCase.profiles?.email ?? "?").trim().charAt(0).toUpperCase()}
                </span>
                <span className="karen-client-card__content">
                  <span className="karen-client-card__topline">
                    <strong>{clientCase.profiles?.full_name ?? clientCase.profiles?.email ?? "—"}</strong>
                    {unreadCount > 0 ? <b>{unreadCount} {copy.unread}</b> : null}
                  </span>
                  <span>{clientCase.title ?? label(statusLabels, clientCase.status)}</span>
                  <small>{label(urgencyLabels, clientCase.urgency)} · {copy.waiting}: {dateFormatter.format(new Date(clientCase.updated_at))}</small>
                </span>
                <span className="karen-client-card__arrow" aria-label={copy.open}>›</span>
              </Link>
            );
          })}
        </div>

        <section className="karen-mobile-assistant" id="karen-mobile-assistant" aria-labelledby="karen-mobile-assistant-title">
          <span className="panel__label">Professor Python AI</span>
          <h2 className="staff-assistant__title" id="karen-mobile-assistant-title">
            <AnhamAvatar className="staff-assistant__face" size={44} state="client" />
            {copy.assistantTitle}
          </h2>
          {assistantConfigured ? (
            <AssistantChat
              attachments
              endpoint="/api/assistant/staff"
              intro={copy.assistantIntro}
              placeholder={copy.assistantPlaceholder}
              providerChoice={showProviders}
              suggestions={copy.assistantSuggestions}
            />
          ) : (
            <p className="form-message form-message--error">{copy.assistantUnavailable}</p>
          )}
        </section>
      </section>

      <div className="karen-desktop-home">
      <PageHeader
        eyebrow="Рабочее место команды"
        title="Админ-панель"
        description="Слева — кейсы и обращения, справа — ИИ-помощник Professor Python."
      />

      <div className="admin-split">
        <section aria-label="Рабочие разделы" className="admin-split__work">
          <div className="panel panel--alert">
            <span className="panel__label">Требует внимания</span>
            <h2>Красные флаги</h2>
            <EscalationPanel
              escalations={escalations.escalations}
              loadError={escalations.error}
            />
          </div>
          <div className="panel">
            <span className="panel__label">Сессия</span>
            <h2>{auth.email ?? "Сотрудник"}</h2>
            <p>Роль: {auth.role}</p>
            <div className="panel-actions">
              <LogoutButton />
            </div>
          </div>
          <div className="panel">
            <span className="panel__label">Кейсы</span>
            <h2>
              Кейсы клиентов
              {unread.total > 0 ? (
                <span className="unread-badge unread-badge--inline">
                  {unread.total} нов.
                </span>
              ) : null}
            </h2>
            <p>
              Анкеты онбординга, статусы, история и управление каждым кейсом.
              {unread.total > 0
                ? " Есть непрочитанные сообщения от клиентов."
                : ""}
            </p>
            <div className="panel-actions">
              <Link className="button button--secondary" href="/admin/cases">
                Открыть кейсы
              </Link>
            </div>
          </div>
          <div className="panel">
            <span className="panel__label">Документы</span>
            <h2>Входящие документы</h2>
            <p>
              Все загруженные документы с открытием файла по защищённой ссылке.
            </p>
            <div className="panel-actions">
              <Link className="button button--secondary" href="/admin/documents">
                Открыть документы
              </Link>
            </div>
          </div>
          <div className="panel">
            <span className="panel__label">Обращения</span>
            <h2>Сообщения клиентов</h2>
            <p>
              Вопросы из кабинета: контакты клиента и управление статусом.
            </p>
            <div className="panel-actions">
              <Link className="button button--secondary" href="/admin/requests">
                Открыть обращения
              </Link>
            </div>
          </div>
        </section>

        <section aria-label="ИИ-помощник Professor Python" className="admin-split__assistant" id="karen-assistant">
          <div className="panel">
            <span className="panel__label">ИИ-помощник Professor Python</span>
            <h2 className="staff-assistant__title">
              <AnhamAvatar className="staff-assistant__face" size={44} state="client" />
              Рабочий чат
            </h2>
            {assistantConfigured ? (
              <AssistantChat
                attachments
                endpoint="/api/assistant/staff"
                intro="Здравствуйте, Professor Python! Вставьте вопрос клиента, текст анкеты или задачу — помогу с черновиком ответа, выжимкой или планом. Можно прикрепить до 30 фото или PDF за раз (скрепка внизу): снимки сжимаются сами, а если файлов много — я прочитаю их по частям и соберу общий разбор. Файлы нигде не сохраняются."
                placeholder="Вставьте вопрос или прикрепите файл…"
                providerChoice={showProviders}
                suggestions={[
                  "Разбери приложенные анализы по методу",
                  "Составь черновик ответа клиенту",
                  "Сделай выжимку анкеты",
                  "Помоги сформулировать знание для ИИ клиентов"
                ]}
              />
            ) : (
              <p className="form-message form-message--error">
                {showProviders
                  ? "ИИ-помощник ещё не подключён: добавьте в Vercel переменную окружения ANTHROPIC_API_KEY (Claude) и/или OPENAI_API_KEY (GPT) и сделайте Redeploy."
                  : "ИИ-помощник ещё не подключён. Напишите основателю — это настройка платформы."}
              </p>
            )}
          </div>

          <div className="panel">
            <span className="panel__label">Обучение ИИ</span>
            <h2>База знаний</h2>
            <p>
              Всё, что вы сохраните здесь, ИИ начнёт использовать в ответах:
              «ИИ клиентов» отвечает посетителям на сайте, «ИИ Professor Python» — вам в
              этом чате.
            </p>
            <KnowledgePanel entries={knowledge.entries} loadError={knowledge.error} />
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}
