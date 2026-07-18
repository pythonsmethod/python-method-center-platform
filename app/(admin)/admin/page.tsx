import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { LogoutButton } from "@/components/LogoutButton";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { KnowledgePanel } from "@/components/assistant/KnowledgePanel";
import { EscalationPanel } from "@/components/escalations/EscalationPanel";
import { listKnowledgeEntries } from "@/lib/assistant/knowledge";
import { listOpenEscalations } from "@/lib/escalations/queries";
import { hasAssistantEnv } from "@/lib/assistant/router";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";

export default async function AdminPage() {
  const auth = await getRequiredStaffUser("/admin");

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

  const [knowledge, escalations] = await Promise.all([
    listKnowledgeEntries(),
    listOpenEscalations()
  ]);
  const assistantConfigured = hasAssistantEnv();

  return (
    <div className="page-shell page-shell--wide">
      <PageHeader
        eyebrow="Рабочее место команды"
        title="Админ-панель"
        description="Слева — кейсы и обращения, справа — ИИ-помощник Карена."
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
            <h2>Кейсы клиентов</h2>
            <p>
              Анкеты онбординга, статусы, история и управление каждым кейсом.
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

        <section aria-label="ИИ-помощник Карена" className="admin-split__assistant">
          <div className="panel">
            <span className="panel__label">ИИ-помощник Карена</span>
            <h2>Рабочий чат</h2>
            {assistantConfigured ? (
              <AssistantChat
                endpoint="/api/assistant/staff"
                intro="Здравствуйте, Карен! Вставьте вопрос клиента, текст анкеты или задачу — помогу с черновиком ответа, выжимкой или планом. Внизу можно выбрать, кто отвечает: Claude, GPT или оба вместе. Доступа к базе у меня нет: работаю с тем, что вставлено в чат."
                placeholder="Вставьте вопрос клиента или задачу…"
                providerChoice
                suggestions={[
                  "Составь черновик ответа клиенту",
                  "Сделай выжимку анкеты",
                  "Помоги сформулировать знание для ИИ клиентов"
                ]}
              />
            ) : (
              <p className="form-message form-message--error">
                ИИ-помощник ещё не подключён: добавьте в Vercel переменную
                окружения ANTHROPIC_API_KEY (Claude) и/или OPENAI_API_KEY (GPT)
                и сделайте Redeploy.
              </p>
            )}
          </div>

          <div className="panel">
            <span className="panel__label">Обучение ИИ</span>
            <h2>База знаний</h2>
            <p>
              Всё, что вы сохраните здесь, ИИ начнёт использовать в ответах:
              «ИИ клиентов» отвечает посетителям на сайте, «ИИ Карена» — вам в
              этом чате.
            </p>
            <KnowledgePanel entries={knowledge.entries} loadError={knowledge.error} />
          </div>
        </section>
      </div>
    </div>
  );
}
