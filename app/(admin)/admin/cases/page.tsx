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
import { searchCases } from "@/lib/cases/search";
import { getStaffUnreadCounts } from "@/lib/messages/queries";
import { formatDateTime } from "@/lib/i18n/format";
import {
  caseStatusLabel,
  caseUrgencyLabel
} from "@/lib/i18n/status-labels";
import { getLocale, type Locale } from "@/lib/i18n/locale";
import { countryFlag } from "@/lib/profile/identity";

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
    <div className="table-wrap staff-case-desktop">
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
              <td>
                {clientCase.profiles?.full_name ?? "Без имени"}
                {clientCase.case_number ? ` · ${clientCase.case_number}` : ""}
                {clientCase.profiles?.country_code ? ` · ${countryFlag(clientCase.profiles.country_code)}` : ""}
              </td>
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

function CaseCards({
  cases,
  locale,
  unreadByCase
}: {
  cases: StaffCaseListItem[];
  locale: Locale;
  unreadByCase: Record<string, number>;
}) {
  const copy = locale === "ru"
    ? {
        unnamed: "Без имени",
        open: "Открыть клиента",
        unread: "новых",
        updated: "Обновлён",
        empty: "Клиентов пока нет.",
        status: {
          created: "Создан",
          awaiting_onboarding: "Ожидает анкету",
          ready_for_review: "Передан на изучение",
          in_review: "Изучается",
          active_support: "Сопровождение",
          inactive_support: "Приостановлен",
          completed: "Завершён",
          archived: "В архиве"
        },
        urgency: { normal: "Обычная", elevated: "Повышенная", critical: "Критическая" }
      }
    : {
        unnamed: "Unnamed client",
        open: "Open client",
        unread: "new",
        updated: "Updated",
        empty: "There are no clients yet.",
        status: {
          created: "Created",
          awaiting_onboarding: "Awaiting questionnaire",
          ready_for_review: "Ready for review",
          in_review: "Under review",
          active_support: "Active support",
          inactive_support: "Paused",
          completed: "Completed",
          archived: "Archived"
        },
        urgency: { normal: "Normal", elevated: "Elevated", critical: "Critical" }
      };
  const label = (labels: Record<string, string>, value: string) =>
    labels[value] ?? value.replaceAll("_", " ");
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "short" });

  if (cases.length === 0) {
    return <p className="empty-state staff-case-mobile">{copy.empty}</p>;
  }

  return (
    <div className="staff-case-mobile staff-client-list">
      {cases.map((clientCase) => {
        const name = clientCase.profiles?.full_name ?? clientCase.profiles?.email ?? copy.unnamed;
        const unreadCount = unreadByCase[clientCase.id] ?? 0;

        return (
          <Link className="staff-client-card" href={`/admin/cases/${clientCase.id}`} key={clientCase.id}>
            <span className="staff-client-card__avatar" aria-hidden="true">
              {name.trim().charAt(0).toUpperCase() || "?"}
            </span>
            <span className="staff-client-card__body">
              <span className="staff-client-card__name-row">
                <strong>
                  {name}{clientCase.case_number ? ` · ${clientCase.case_number}` : ""}
                  {clientCase.profiles?.country_code ? ` · ${countryFlag(clientCase.profiles.country_code)}` : ""}
                </strong>
                {unreadCount > 0 ? <b>{unreadCount} {copy.unread}</b> : null}
              </span>
              {clientCase.title ? <span className="staff-client-card__goal">{clientCase.title}</span> : null}
              <span className="staff-client-card__meta">
                {label(copy.status, clientCase.status)} · {label(copy.urgency, clientCase.urgency)}
              </span>
              <small>{copy.updated}: {formatter.format(new Date(clientCase.updated_at))}</small>
            </span>
            <span className="staff-client-card__open">
              <span>{copy.open}</span>
              <b aria-hidden="true">›</b>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function StaffCasesPage({ searchParams }: PageProps) {
  const query = ((await searchParams).q ?? "").slice(0, 120);
  const auth = await getRequiredStaffUser("/admin/cases");
  const locale = await getLocale();

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

  const found =
    casesResult.status === "ready" ? searchCases(casesResult.cases, query) : [];

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Рабочее место команды"
        title="Кейсы клиентов"
        description="Список кейсов с анкетами и документами. Открывайте кейс для просмотра анкеты."
      />

      <section className="panel-grid staff-session-panel">
        <div className="panel">
          <span className="panel__label">Сессия</span>
          <h2>{auth.email ?? "Сотрудник"}</h2>
          <p>Роль: {auth.role}</p>
          <div className="panel-actions">
            <LogoutButton />
          </div>
        </div>
      </section>

      {/* A payment arrives from an address and the first question is always
          "do we know this person?". Scrolling a growing table on a phone to
          answer it is how an account gets missed. A plain form, so it works
          with the page reloaded and needs no JavaScript. */}
      <section className="panel" aria-label="Поиск по кейсам">
        <form className="case-search" method="get">
          <label className="field">
            <span>Найти клиента</span>
            <input
              autoComplete="off"
              defaultValue={query}
              name="q"
              placeholder="Email, имя, телефон или номер кейса"
              type="search"
            />
          </label>
          <button className="button button--secondary" type="submit">
            Найти
          </button>
          {query ? (
            <Link className="button button--secondary" href="/admin/cases">
              Сбросить
            </Link>
          ) : null}
        </form>
      </section>

      <section className="intake-section" aria-label="Кейсы клиентов">
        {casesResult.status === "ready" ? (
          <>
            {query ? (
              <p className="case-search__result">
                {found.length > 0
                  ? `Найдено: ${found.length} из ${casesResult.cases.length}`
                  : `Ничего не найдено по запросу «${query}». Скорее всего, у этого человека ещё нет аккаунта на сайте.`}
              </p>
            ) : null}
            <CaseTable cases={found} unreadByCase={unread.byCase} />
            <CaseCards cases={found} locale={locale} unreadByCase={unread.byCase} />
          </>
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
