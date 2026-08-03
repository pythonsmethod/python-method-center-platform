import type { Metadata } from "next";
import Link from "next/link";
import { isFreeReviewActive } from "@/lib/config/promo";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";

export const metadata: Metadata = {
  title: "Разбор анализов от Professor Python — Python Method Center",
  description:
    "Что именно входит в разбор анализов, в каком виде и как быстро приходит ответ, кто его делает и что будет дальше."
};

// Where "Get the review" leads: the offer's own page. The eight answers
// live here — a person reads the terms first and meets the registration
// form after, not before.
export default async function ReviewPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const promo = dict.promo;
  const details = dict.promoDetails;
  const freeReview = isFreeReviewActive();

  // "Why is it free?" only makes sense while it is.
  const items = freeReview ? details.items : details.items.slice(1);

  return (
    <div className="page-shell">
      <section className="hero">
        <p className="eyebrow">{promo.badge}</p>
        <h1>{freeReview ? promo.titleFree : promo.titlePaid}</h1>
        <p className="hero__subtitle">
          {freeReview ? promo.priceFree : promo.pricePaid}{" "}
          {promo.priceAmount}
        </p>
      </section>

      <section aria-label={details.title} className="promo-faq">
        <h2 className="section-title">{details.title}</h2>
        <p className="promo-faq__lead">{details.lead}</p>
        <dl className="promo-faq__list">
          {items.map((item) => (
            <div className="promo-faq__item" key={item.q}>
              <dt>{item.q}</dt>
              <dd>{item.a}</dd>
            </div>
          ))}
        </dl>
        <p className="promo-faq__note">{promo.note}</p>
      </section>

      <section aria-label={details.pageCtaTitle} className="panel review-cta">
        <h2>{details.pageCtaTitle}</h2>
        <p>{details.pageCtaText}</p>
        <div className="panel-actions">
          <Link className="button" href="/login">
            {details.pageCta}
          </Link>
        </div>
      </section>
    </div>
  );
}
