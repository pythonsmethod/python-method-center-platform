import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PublicSupportForm } from "@/components/support/PublicSupportForm";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";

// Indexed and listed in the sitemap: without its own title and description
// this page competed with the home page for the same search snippet.
export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale()).support;

  return { title: t.title, description: t.description };
}

export default async function SupportPage() {
  const locale = await getLocale();
  const t = getDictionary(locale).support;

  return (
    <div className="page-shell">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      {/* People come here to write, so the form is the first thing they
          meet and the full emergency block sits at the foot of the page.
          What stays here is one line, because the assistant routes people
          in crisis to this page: someone whose life is in danger must not
          have to read to the bottom to learn that we are not the number
          to call. The footer carries 112/911 on every page as well. */}
      <p className="support-emergency-line">
        {t.emergencyShort} <a href="#emergency">{t.emergencyShortLink}</a>
      </p>

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">{t.guestLabel}</span>
          <h2>{t.guestTitle}</h2>
          <p>{t.guestText}</p>
          <PublicSupportForm
            locale={locale}
            labels={{
              email: t.formEmail,
              category: t.formCategory,
              categoryLogin: t.catLogin,
              categoryPayment: t.catPayment,
              categoryTechnical: t.catTechnical,
              categoryOther: t.catOther,
              message: t.formMessage,
              consent: t.formConsent,
              submit: t.formSubmit,
              submitting: t.formSubmitting
            }}
          />
        </div>
        <div className="panel">
          <span className="panel__label">{t.label}</span>
          <h2>{t.cardTitle}</h2>
          <p>
            {t.cardText1} <Link href="/cabinet">{t.cabinetLink}</Link>
            {t.cardText2}
          </p>
          <div className="panel-actions">
            <Link className="button button--secondary" href="/login">
              {t.loginCta}
            </Link>
          </div>
        </div>
      </section>

      <section className="panel-grid" aria-label={t.helpLabel}>
        <div className="panel">
          <span className="panel__label">{t.helpLabel}</span>
          <h2>{t.helpLoginTitle}</h2>
          <p>{t.helpLoginText}</p>
          <div className="panel-actions">
            <Link className="button button--secondary" href="/recovery">
              {t.helpLoginCta}
            </Link>
          </div>
        </div>
        <div className="panel">
          <span className="panel__label">{t.helpLabel}</span>
          <h2>{t.helpPaymentTitle}</h2>
          <p>{t.helpPaymentText}</p>
        </div>
      </section>

      <div className="notice notice--warning" id="emergency" role="note">
        <span className="panel__label">{t.emergencyLabel}</span>
        <h2>{t.emergencyTitle}</h2>
        <p>{t.emergencyText}</p>
      </div>
    </div>
  );
}
