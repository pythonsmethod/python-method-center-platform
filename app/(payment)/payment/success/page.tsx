import type { Metadata } from "next";
import { Link } from "@/components/LocaleLink";
import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { getBillingSettings } from "@/lib/payments/checkout-settings";
import { getStripe } from "@/lib/payments/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale()).paymentSuccess;

  return { title: t.metadataTitle, description: t.metadataDescription };
}

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const locale = await getLocale();
  const t = getDictionary(locale).paymentSuccess;
  const { session_id: sessionId } = await searchParams;
  let paid = false;
  let recorded = false;
  let product: string | null = null;
  let paidPeriod: { starts_at: string; ends_at: string } | null = null;
  if (sessionId && /^cs_(test_|live_)?[A-Za-z0-9]{10,}$/.test(sessionId)) {
    try {
      const settings = getBillingSettings();
      const stripe = settings ? getStripe() : null;
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = supabase
        ? await supabase.auth.getUser()
        : { data: { user: null } };
      if (stripe && user && !user.is_anonymous) {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        paid = session.livemode === settings?.livemode && session.client_reference_id === user.id &&
          session.status === "complete" && session.payment_status === "paid";
        if (paid && supabase) {
          const reference = typeof session.payment_intent === "string"
            ? session.payment_intent : session.payment_intent?.id ?? session.id;
          const { data: payment, error } = await supabase.from("payments")
            .select("id, product, status")
            .eq("profile_id", user.id).eq("processor_reference", reference).maybeSingle();
          recorded = !error && payment?.status === "paid";
          product = recorded && payment ? payment.product : null;
          if (recorded && payment && product === "personal_support") {
            const { data: period, error: periodError } = await supabase.from("service_periods")
              .select("starts_at, ends_at")
              .eq("profile_id", user.id).eq("payment_id", payment.id).maybeSingle();
            if (!periodError && period) paidPeriod = period;
          }
        }
      }
    } catch {
      // A return URL alone is never evidence that a charge succeeded.
    }
  }

  const supportReady = recorded && product === "personal_support" && paidPeriod !== null;
  const assessmentReady = recorded && product === "preliminary_assessment";
  const formatPeriod = (value: string) => `${new Intl.DateTimeFormat(locale, {
    dateStyle: "long", timeStyle: "short", timeZone: "UTC"
  }).format(new Date(value))} UTC`;

  if (!paid) {
    return (
      <div className="page-shell">
        <PageHeader eyebrow={t.pendingEyebrow} title={t.pendingTitle} description={t.pendingDescription} />
        <div className="panel-actions">
          <Link className="button" href="/cabinet">{t.cabinetCta}</Link>
          <Link className="button button--secondary" href="/payment">{t.retryCta}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      <section className="panel" aria-live="polite">
        <h2>{supportReady ? t.accessActiveTitle : assessmentReady ? t.assessmentReadyTitle : t.accessPendingTitle}</h2>
        {supportReady && paidPeriod ? <p>{t.accessDates}: {formatPeriod(paidPeriod.starts_at)} — {formatPeriod(paidPeriod.ends_at)}</p>
          : <p>{assessmentReady ? t.assessmentReadyText : t.accessPendingText}</p>}
        {!supportReady && !assessmentReady && sessionId ? <div className="panel-actions">
          <Link className="button button--secondary" href={`/payment/success?session_id=${encodeURIComponent(sessionId)}`}>{t.refreshCta}</Link>
        </div> : null}
      </section>

      <section className="panel-grid" aria-label={t.whatNextLabel}>
        <div className="panel panel--promo">
          <span className="panel__label">{t.whatNextLabel}</span>
          <ol className="success-steps">
            {t.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="panel-actions">
            {(supportReady || assessmentReady) ? <Link className="button" href="/onboarding">{t.questionnaireCta}</Link> : null}
            {supportReady ? <Link className="button button--secondary" href="/cabinet/delivery">{t.deliveryCta}</Link> : null}
            <Link className="button" href="/cabinet">
              {t.cabinetCta}
            </Link>
          </div>
        </div>
        <div className="panel">
          <span className="panel__label">{t.questionLabel}</span>
          <h2>{t.questionTitle}</h2>
          <p>{t.questionText}</p>
          <div className="panel-actions">
            <Link className="button button--secondary" href="/support">
              {t.supportCta}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
