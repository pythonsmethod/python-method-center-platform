import Link from "next/link";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { LogoutButton } from "@/components/LogoutButton";
import { ProfileDetailsForm } from "@/components/cabinet/ProfileDetailsForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
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
  const locale = await getLocale();
  const strings = getDictionary(locale);
  const dict = strings.cabinet;
  const t = dict.account;
  const auth = await getRequiredUser("/cabinet/account");

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow={t.eyebrow}
          title={t.title}
          description={t.setupDescription}
        />
        <AuthSetupNotice title={t.setupNotice} labels={strings.setup} />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: profileRow } = supabase
    ? await supabase
        .from("profiles")
        .select("full_name, phone, delivery_address")
        .eq("id", auth.userId)
        .maybeSingle()
    : { data: null };

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
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">{t.detailsLabel}</span>
          <h2>{t.detailsTitle}</h2>
          <p>
{t.detailsText}
          </p>
          <ProfileDetailsForm
            labels={dict.profileForm}
            deliveryAddress={
              (profileRow?.delivery_address as string | null) ?? null
            }
            email={auth.email}
            fullName={profileRow?.full_name ?? null}
            phone={profileRow?.phone ?? null}
          />
          <div className="panel-actions">
            <LogoutButton label={dict.logout} />
          </div>
        </div>

        <div className="panel">
          <span className="panel__label">{t.caseLabel}</span>
          {caseResult.status === "error" ? (
            <>
              <h2>{t.caseUnavailable}</h2>
              <p>{caseResult.message}</p>
            </>
          ) : caseResult.case ? (
            <>
              <h2>{caseStatusLabel(caseResult.case.status, locale)}</h2>
              <ul className="status-list">
                <li>
                  {t.caseNumber}: <code>{caseResult.case.id}</code>
                </li>
                <li>
                  {t.caseGoal}: {caseResult.case.title ?? t.caseGoalEmpty}
                </li>
                <li>
                  {t.caseUrgency}: {caseUrgencyLabel(caseResult.case.urgency, locale)}
                </li>
                <li>
                  {t.caseDirection}: {caseDirectionLabel(caseResult.case.direction, locale)}
                </li>
                <li>
                  {t.caseCreated}: {formatDateTime(caseResult.case.created_at, locale)}
                </li>
              </ul>
            </>
          ) : (
            <>
              <h2>{t.caseNoneTitle}</h2>
              <p>
                {t.caseNoneText}
              </p>
              <div className="panel-actions">
                <Link className="button" href="/onboarding">
                  {t.caseNoneCta}
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="panel-grid" aria-label={t.paymentsAria}>
        <div className="panel">
          <span className="panel__label">{t.paymentsLabel}</span>
          <h2>{t.paymentsTitle}</h2>
          {paymentsResult.status === "error" ? (
            <p className="empty-state">{paymentsResult.message}</p>
          ) : paymentsResult.payments.length === 0 ? (
            <p className="empty-state">
              {t.paymentsEmptyPrefix}
              <Link href="/payment">{t.paymentsEmptyLink}</Link>.
            </p>
          ) : (
            <ul className="status-list">
              {paymentsResult.payments.map((payment) => (
                <li key={payment.id}>
                  {paymentProductLabel(payment.product, locale)} —{" "}
                  {(payment.amount_cents / 100).toFixed(2)} {payment.currency} —{" "}
                  {paymentStatusLabel(payment.status, locale)}
                  {payment.paid_at
                    ? ` (${formatDateTime(payment.paid_at, locale)})`
                    : ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <span className="panel__label">{t.historyLabel}</span>
          <h2>{t.historyTitle}</h2>
          {!historyResult ? (
            <p className="empty-state">
              {t.historyNoCase}
            </p>
          ) : historyResult.status === "error" ? (
            <p className="empty-state">{historyResult.message}</p>
          ) : historyResult.events.length === 0 ? (
            <p className="empty-state">{t.historyEmpty}</p>
          ) : (
            <ul className="status-list">
              {historyResult.events.map((event) => (
                <li key={event.id}>
                  {formatDateTime(event.created_at, locale)} —{" "}
                  {lifecycleEventLabel(event.event_type, locale)}
                  {event.to_status
                    ? `: ${caseStatusLabel(event.to_status, locale)}`
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
