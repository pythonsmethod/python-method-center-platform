import Link from "next/link";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { LogoutButton } from "@/components/LogoutButton";
import { PageHeader } from "@/components/PageHeader";
import { getRequiredUser } from "@/lib/auth/require-user";
import {
  getClientCaseShell,
  getOwnCaseLifecycleEvents
} from "@/lib/cases/queries";
import { formatDateTime } from "@/lib/i18n/format";
import { getOwnPayments } from "@/lib/payments/queries";
import {
  caseDirectionLabel,
  caseStatusLabel,
  caseUrgencyLabel,
  lifecycleEventLabel,
  paymentProductLabel,
  paymentStatusLabel
} from "@/lib/i18n/status-labels";

export const dynamic = "force-dynamic";

// Everything a person looks at once and then rarely again: who they are,
// what their case is, and how it got there. The cabinet itself stays for
// the daily work — documents, chat, payments.
export default async function AccountPage() {
  const auth = await getRequiredUser("/cabinet/account");

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Аккаунт"
          title="Ваш аккаунт"
          description="Для этого раздела требуется настроенная аутентификация."
        />
        <AuthSetupNotice title="Раздел требует настройки Supabase Auth" />
      </div>
    );
  }

  const [caseResult, paymentsResult] = await Promise.all([
    getClientCaseShell(auth.userId),
    getOwnPayments(auth.userId)
  ]);
  const historyResult =
    caseResult.status === "ready" && caseResult.case
      ? await getOwnCaseLifecycleEvents(auth.userId, caseResult.case.id)
      : null;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Аккаунт"
        title="Ваш аккаунт"
        description="Данные аккаунта, ваш кейс, оплаты и история."
      />

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">Аккаунт</span>
          <h2>{auth.email ?? "Вы вошли в систему"}</h2>
          <p>
            Один аккаунт — один непрерывный кейс. Все документы и сообщения
            привязаны к нему.
          </p>
          <div className="panel-actions">
            <LogoutButton />
          </div>
        </div>

        <div className="panel">
          <span className="panel__label">Ваш кейс</span>
          {caseResult.status === "error" ? (
            <>
              <h2>Статус кейса недоступен</h2>
              <p>{caseResult.message}</p>
            </>
          ) : caseResult.case ? (
            <>
              <h2>{caseStatusLabel(caseResult.case.status)}</h2>
              <ul className="status-list">
                <li>
                  Номер кейса: <code>{caseResult.case.id}</code>
                </li>
                <li>Цель: {caseResult.case.title ?? "Не указана"}</li>
                <li>Срочность: {caseUrgencyLabel(caseResult.case.urgency)}</li>
                <li>
                  Направление: {caseDirectionLabel(caseResult.case.direction)}
                </li>
                <li>Создан: {formatDateTime(caseResult.case.created_at)}</li>
              </ul>
            </>
          ) : (
            <>
              <h2>Кейса пока нет</h2>
              <p>
                Заполните анкету, чтобы создать кейс — после этого можно будет
                загрузить документы.
              </p>
              <div className="panel-actions">
                <Link className="button" href="/onboarding">
                  Заполнить анкету
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="panel-grid" aria-label="Оплаты и история">
        <div className="panel">
          <span className="panel__label">Оплаты</span>
          <h2>Ваши оплаты</h2>
          {paymentsResult.status === "error" ? (
            <p className="empty-state">{paymentsResult.message}</p>
          ) : paymentsResult.payments.length === 0 ? (
            <p className="empty-state">
              Оплат пока нет. Тарифы описаны на странице{" "}
              <Link href="/payment">«Сопровождение»</Link>.
            </p>
          ) : (
            <ul className="status-list">
              {paymentsResult.payments.map((payment) => (
                <li key={payment.id}>
                  {paymentProductLabel(payment.product)} —{" "}
                  {(payment.amount_cents / 100).toFixed(2)} {payment.currency} —{" "}
                  {paymentStatusLabel(payment.status)}
                  {payment.paid_at
                    ? ` (${formatDateTime(payment.paid_at)})`
                    : ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <span className="panel__label">История</span>
          <h2>История кейса</h2>
          {!historyResult ? (
            <p className="empty-state">
              История появится после создания кейса.
            </p>
          ) : historyResult.status === "error" ? (
            <p className="empty-state">{historyResult.message}</p>
          ) : historyResult.events.length === 0 ? (
            <p className="empty-state">Событий пока нет.</p>
          ) : (
            <ul className="status-list">
              {historyResult.events.map((event) => (
                <li key={event.id}>
                  {formatDateTime(event.created_at)} —{" "}
                  {lifecycleEventLabel(event.event_type)}
                  {event.to_status
                    ? `: ${caseStatusLabel(event.to_status)}`
                    : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
