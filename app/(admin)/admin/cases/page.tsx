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
import { getLocale, type Locale } from "@/lib/i18n/locale";
import { countryFlag } from "@/lib/profile/identity";

function shortId(value: string): string {
  return value.slice(0, 8);
}

function CaseTable({
  cases,
  locale,
  unreadByCase
}: {
  cases: StaffCaseListItem[];
  locale: Locale;
  unreadByCase: Record<string, number>;
}) {
  const copy = locale === "ru"
    ? { empty: "Кейсов пока нет.", case: "Кейс", chat: "Чат", client: "Клиент", contacts: "Контакты", goal: "Цель", created: "Создан", open: "Открыть", unnamed: "Без имени" }
    : { empty: "There are no cases yet.", case: "Case", chat: "Chat", client: "Client", contacts: "Contacts", goal: "Goal", created: "Created", open: "Open", unnamed: "Unnamed" };

  if (cases.length === 0) {
    return <p className="empty-state">{copy.empty}</p>;
  }

  return (
    <div className="table-wrap staff-case-desktop">
      <table className="data-table">
        <thead>
          <tr>
            <th>{copy.case}</th>
            <th>{copy.chat}</th>
            <th>{copy.client}</th>
            <th>{copy.contacts}</th>
            <th>{copy.goal}</th>
            <th>{copy.created}</th>
            <th>{copy.open}</th>
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
                {clientCase.profiles?.full_name ?? copy.unnamed}
                {clientCase.case_number ? ` · ${clientCase.case_number}` : ""}
                {clientCase.profiles?.country_code ? ` · ${countryFlag(clientCase.profiles.country_code)}` : ""}
              </td>
              <td>
                {clientCase.profiles?.email ?? "—"}
                <br />
                {clientCase.profiles?.phone ?? ""}
              </td>
              <td>{clientCase.title ?? "—"}</td>
              <td>{formatDateTime(clientCase.created_at, locale)}</td>
              <td>
                <Link
                  className="button button--secondary button--compact"
                  href={`/admin/cases/${clientCase.id}`}
                >
                  {copy.open}
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
        empty: "Клиентов пока нет."
      }
    : {
        unnamed: "Unnamed client",
        open: "Open client",
        unread: "new",
        updated: "Updated",
        empty: "There are no clients yet."
      };
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
  const copy = locale === "ru"
    ? {
        eyebrow: "Рабочее место команды", title: "Кейсы клиентов",
        description: "Список кейсов с анкетами и документами. Открывайте кейс для просмотра анкеты.",
        authRequired: "Для доступа требуется настроенная аутентификация.", authSetup: "Кейсы требуют настройки Supabase Auth",
        authFailed: "Не удалось проверить доступ.", accessError: "Ошибка доступа", unavailable: "Кейсы недоступны",
        loadFailed: "Не удалось загрузить кейсы", session: "Сессия", employee: "Сотрудник", role: "Роль",
        searchAria: "Поиск по кейсам", searchLabel: "Найти клиента", searchPlaceholder: "Email, имя, телефон или номер кейса",
        search: "Найти", reset: "Сбросить", casesAria: "Кейсы клиентов",
        found: (count: number, total: number) => `Найдено: ${count} из ${total}`,
        notFound: (value: string) => `Ничего не найдено по запросу «${value}». Скорее всего, у этого человека ещё нет аккаунта на сайте.`
      }
    : {
        eyebrow: "Team workspace", title: "Client cases",
        description: "Cases with questionnaires and documents. Open a case to review its materials.",
        authRequired: "Configured authentication is required for access.", authSetup: "Cases require Supabase Auth configuration",
        authFailed: "Access could not be verified.", accessError: "Access error", unavailable: "Cases unavailable",
        loadFailed: "Cases could not be loaded", session: "Session", employee: "Team member", role: "Role",
        searchAria: "Search cases", searchLabel: "Find a client", searchPlaceholder: "Email, name, phone or case number",
        search: "Search", reset: "Reset", casesAria: "Client cases",
        found: (count: number, total: number) => `Found: ${count} of ${total}`,
        notFound: (value: string) => `Nothing matched “${value}”. This person may not have an account yet.`
      };

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.authRequired}
        />

        <AuthSetupNotice title={copy.authSetup} />
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
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.authFailed}
        />

        <div className="notice notice--warning">
          <span className="panel__label">{copy.accessError}</span>
          <h2>{copy.unavailable}</h2>
          <p>{auth.message}</p>
        </div>
      </div>
    );
  }

  const [casesResult, unread] = await Promise.all([
    getStaffCases(),
    getStaffUnreadCounts(auth.email)
  ]);

  const found =
    casesResult.status === "ready" ? searchCases(casesResult.cases, query) : [];

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />

      <section className="panel-grid staff-session-panel">
        <div className="panel">
          <span className="panel__label">{copy.session}</span>
          <h2>{auth.email ?? copy.employee}</h2>
          <p>{copy.role}: {auth.role}</p>
          <div className="panel-actions">
            <LogoutButton />
          </div>
        </div>
      </section>

      {/* A payment arrives from an address and the first question is always
          "do we know this person?". Scrolling a growing table on a phone to
          answer it is how an account gets missed. A plain form, so it works
          with the page reloaded and needs no JavaScript. */}
      <section className="panel" aria-label={copy.searchAria}>
        <form className="case-search" method="get">
          <label className="field">
            <span>{copy.searchLabel}</span>
            <input
              autoComplete="off"
              defaultValue={query}
              name="q"
              placeholder={copy.searchPlaceholder}
              type="search"
            />
          </label>
          <button className="button button--secondary" type="submit">
            {copy.search}
          </button>
          {query ? (
            <Link className="button button--secondary" href="/admin/cases">
              {copy.reset}
            </Link>
          ) : null}
        </form>
      </section>

      <section className="intake-section" aria-label={copy.casesAria}>
        {casesResult.status === "ready" ? (
          <>
            {query ? (
              <p className="case-search__result">
                {found.length > 0
                  ? copy.found(found.length, casesResult.cases.length)
                  : copy.notFound(query)}
              </p>
            ) : null}
            <CaseTable cases={found} locale={locale} unreadByCase={unread.byCase} />
            <CaseCards cases={found} locale={locale} unreadByCase={unread.byCase} />
          </>
        ) : (
          <div className="notice notice--warning">
            <span className="panel__label">{copy.unavailable}</span>
            <h2>{copy.loadFailed}</h2>
            <p>{casesResult.message}</p>
          </div>
        )}
      </section>
    </div>
  );
}
