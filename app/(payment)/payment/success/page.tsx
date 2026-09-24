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
      }
    } catch {
      // A return URL alone is never evidence that a charge succeeded.
    }
  }

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

      <section className="panel-grid" aria-label={t.whatNextLabel}>
        <div className="panel panel--promo">
          <span className="panel__label">{t.whatNextLabel}</span>
          <ol className="success-steps">
            {t.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="panel-actions">
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
