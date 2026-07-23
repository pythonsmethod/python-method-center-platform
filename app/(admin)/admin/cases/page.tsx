import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { LogoutButton } from "@/components/LogoutButton";
import { PageHeader } from "@/components/PageHeader";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";
import {
  getStaffCases,
  type StaffCaseListItem
} from "@/lib/cases/staff-queries";
import { getStaffUnreadCounts } from "@/lib/messages/queries";
import { formatDateTime } from "@/lib/i18n/format";
import {
  caseStatusLabel,
  caseUrgencyLabel
} from "@/lib/i18n/status-labels";

function shortId(value: string): string {
  return value.slice(0, 8);
}

function CaseTable({
  cases,
  unreadByCase
}: {
  cases: StaffCaseListItem[];
  unreadByCase: Record<string, number>;
}) {
  if (cases.length === 0) {
    return <p className="empty-state">Кейсов пока нет.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Кейс</th>
            <th>Чат</th>
            <th>Клиент</th>
            <th>Контакты</th>
            <th>Цель</th>
            <th>Статус</th>
            <th>Срочность</th>
            <th>Создан</th>
            <th>Открыть</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((clientCase) => (
            <tr key={clientCase.id}>
              <td>
                <code title={clientCase.id}>{shortId(clientCase.id)}</code>
              </td>
              <td>
                {unreadByCase[clientCase.id] ? (
                  <span className="unread-badge">
                    {unreadByCase[clientCase.id]}
                  </span>
                ) : (
                  <span className="unread-badge unread-badge--empty">—</span>
                )}
              </td>
              <td>{clientCase.profiles?.full_name ?? "Без имени"}</td>
              <td>
                {clientCase.profiles?.email ?? "—"}
                <br />
                {clientCase.profiles?.phone ?? ""}
              </td>
              <td>{clientCase.title ?? "—"}</td>
              <td>
                <span className="status-badge">
                  {caseStatusLabel(clientCase.status)}
                </span>
              </td>
              <td>{caseUrgencyLabel(clientCase.urgency)}</td>
              <td>{formatDateTime(clientCase.created_at)}</td>
              <td>
                <Link
                  className="button button--secondary button--compact"
                  href={`/admin/cases/${clientCase.id}`}
                >
                  Открыть
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function StaffCasesPage() {
  const auth = await getRequiredStaffUser("/admin/cases");

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Рабочее место команды"
          title="Кейсы"
          description="Для доступа требуется настроенная аутентификация."
        />

        <AuthSetupNotice title="Кейсы требуют настройки Supabase Auth" />
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
          title="Кейсы"
          description="Не удалось проверить доступ."
        />

        <div className="notice notice--warning">
          <span className="panel__label">Ошибка доступа</span>
          <h2>Кейсы недоступны</h2>
          <p>{auth.message}</p>
        </div>
      </div>
    );
  }

  const [casesResult, unread] = await Promise.all([
    getStaffCases(),
    getStaffUnreadCounts()
  ]);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Рабочее место команды"
        title="Кейсы клиентов"
        description="Список кейсов с анкетами и документами. Открывайте кейс для просмотра анкеты."
      />

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">Сессия</span>
          <h2>{auth.email ?? "Сотрудник"}</h2>
          <p>Роль: {auth.role}</p>
          <div className="panel-actions">
            <LogoutButton />
          </div>
        </div>
      </section>

      <section className="intake-section" aria-label="Кейсы клиентов">
        {casesResult.status === "ready" ? (
          <CaseTable cases={casesResult.cases} unreadByCase={unread.byCase} />
        ) : (
          <div className="notice notice--warning">
            <span className="panel__label">Кейсы недоступны</span>
            <h2>Не удалось загрузить кейсы</h2>
            <p>{casesResult.message}</p>
          </div>
        )}
      </section>
    </div>
  );
}
