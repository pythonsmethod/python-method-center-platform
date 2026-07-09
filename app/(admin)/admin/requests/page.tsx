import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { PageHeader } from "@/components/PageHeader";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";
import { formatDateTime } from "@/lib/i18n/format";
import { supportStatusLabel } from "@/lib/i18n/status-labels";
import { getStaffSupportRequests } from "@/lib/support/queries";
import { RequestStatusButtons } from "./RequestStatusButtons";

export default async function StaffSupportRequestsPage() {
  const auth = await getRequiredStaffUser("/admin/requests");

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Рабочее место команды"
          title="Обращения"
          description="Для доступа требуется настроенная аутентификация."
        />

        <AuthSetupNotice title="Обращения требуют настройки Supabase Auth" />
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
          title="Обращения"
          description="Не удалось проверить доступ."
        />

        <div className="notice notice--warning">
          <span className="panel__label">Ошибка доступа</span>
          <h2>Обращения недоступны</h2>
          <p>{auth.message}</p>
        </div>
      </div>
    );
  }

  const requestsResult = await getStaffSupportRequests();

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Рабочее место команды"
        title="Обращения клиентов"
        description="Сообщения из кабинета. Ответ клиенту отправляется по его контактам (email или телефон), затем статус обновляется здесь."
      />

      <section className="intake-section" aria-label="Обращения клиентов">
        {requestsResult.status === "error" ? (
          <div className="notice notice--warning">
            <span className="panel__label">Обращения недоступны</span>
            <h2>Не удалось загрузить обращения</h2>
            <p>{requestsResult.message}</p>
          </div>
        ) : requestsResult.requests.length === 0 ? (
          <p className="empty-state">Обращений пока нет.</p>
        ) : (
          <ul className="document-list">
            {requestsResult.requests.map((request) => (
              <li className="document-list__item" key={request.id}>
                <div>
                  <strong>{request.subject}</strong>
                  <span>{formatDateTime(request.created_at)}</span>
                  <span className="status-badge">
                    {supportStatusLabel(request.status)}
                  </span>
                </div>
                {request.body ? <p>{request.body}</p> : null}
                <dl>
                  <div>
                    <dt>Клиент</dt>
                    <dd>{request.profiles?.full_name ?? "Без имени"}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{request.profiles?.email ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Телефон</dt>
                    <dd>{request.profiles?.phone ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Кейс</dt>
                    <dd>
                      {request.case_id ? (
                        <Link href={`/admin/cases/${request.case_id}`}>
                          Открыть кейс
                        </Link>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                </dl>
                <RequestStatusButtons
                  currentStatus={request.status}
                  requestId={request.id}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
