import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";

type SuccessPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaymentSuccessPage({
  searchParams
}: SuccessPageProps) {
  const locale = await getLocale();
  const t = getDictionary(locale).paymentSuccess;
  const params = await searchParams;
  const viaPaypal = params?.method === "paypal";

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      {viaPaypal ? (
        <div className="notice notice--success">
          <span className="panel__label">Оплата через PayPal</span>
          <h2>Мы проверим платёж вручную</h2>
          <p>
            Оплата через PayPal не подтверждается автоматически: её проверяет
            человек. Обычно это занимает несколько часов в рабочий день. Как
            только платёж подтвердится, доступ откроется, и мы напишем вам на
            почту.
          </p>
          <p>
            Чтобы ускорить: пришлите через «Поддержку» подтверждение оплаты —
            скриншот или номер операции PayPal, и укажите email, которым вы
            регистрировались.
          </p>
        </div>
      ) : null}

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
