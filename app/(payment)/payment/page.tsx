import type { Metadata } from "next";
import { Link } from "@/components/LocaleLink";
import { PageHeader } from "@/components/PageHeader";
import { PaymentPlans } from "@/components/payments/PaymentPlans";
import { getPaymentPlans } from "@/lib/payments/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale()).payment;

  return {
    title: t.title,
    description: t.description
    // Canonical and hreflang are written by the root layout, which is the
    // only place that knows whether this render is the Russian address or
    // the English one. Pinning a canonical here dropped the pair.
  };
}

// Signed-in clients get their profile id attached to the Stripe link as
// client_reference_id, so the webhook can bind the payment to the account
// without relying on email matching.
function withClientReference(
  url: string | null,
  profileId: string | null
): string | null {
  if (!url || !profileId) {
    return url;
  }

  const target = new URL(url);
  target.searchParams.set("client_reference_id", profileId);
  return target.toString();
}

export default async function PaymentPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.payment;

  let profileId: string | null = null;
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    profileId = user?.id ?? null;
  }

  const plans = getPaymentPlans(locale).map((plan) => ({
    ...plan,
    paymentLinkUrl: withClientReference(plan.paymentLinkUrl, profileId)
  }));

  return (
    <div className="page-shell payment-page">
      {/* Three formats, one list. The review used to have a panel of its
          own above the cards, from the days it was the free offer; as a
          plan it is a card like the other two, and a panel repeating the
          card's text word for word was the same paragraph twice. */}
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      <PaymentPlans
        labels={{
          planLabel: t.planLabel,
          payButton: t.payButton,
          unavailable: t.unavailable,
          startCheckbox: t.startCheckbox,
          offerCheckboxPrefix: t.offerCheckboxPrefix,
          offerCheckboxLink: t.offerCheckboxLink,
          offerHint: t.offerHint,
          refundLink: t.refundLink,
          signInToPay: t.signInToPay,
          signInWhy: t.signInWhy
        }}
        plans={plans}
        signInHref="/login?mode=signup&next=/payment"
        signedIn={Boolean(profileId)}
      />

      <section className="panel-grid" aria-label={t.offerLabel}>
        <div className="panel">
          <span className="panel__label">{t.altLabel}</span>
          <h2>{t.altTitle}</h2>
          <p>{t.altText}</p>
          <div className="panel-actions">
            <Link className="button button--secondary" href="/payment/other">
              {t.altCta}
            </Link>
          </div>
        </div>
        <div className="panel">
          <span className="panel__label">{t.offerLabel}</span>
          <h2>
            <Link href="/legal/offer">{t.offerTitle}</Link>
          </h2>
          <p>{t.offerText}</p>
        </div>
      </section>
    </div>
  );
}
