import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getPaymentPlans } from "@/lib/payments/config";

export default function PaymentPage() {
  const plans = getPaymentPlans();

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Оплата"
        title="Тарифы сопровождения"
        description="Оплата проходит через защищённую страницу Stripe. Платформа не хранит данные карт."
      />

      <section className="panel-grid">
        {plans.map((plan) => (
          <div className="panel" key={plan.product}>
            <span className="panel__label">Тариф</span>
            <h2>{plan.title}</h2>
            <p>{plan.description}</p>
            <div className="panel-actions">
              {plan.paymentLinkUrl ? (
                <a
                  className="button"
                  href={plan.paymentLinkUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Перейти к оплате
                </a>
              ) : (
                <span className="status-badge">
                  Оплата по этому тарифу временно оформляется через команду
                </span>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="panel-grid" aria-label="Как проходит оплата">
        <div className="panel">
          <span className="panel__label">Как это работает</span>
          <h2>Оплата после согласования</h2>
          <p>
            Тариф выбирается после того, как команда изучит ваш кейс и
            согласует с вами план сопровождения. Если кнопка оплаты недоступна
            или вам нужен счёт — напишите команде через{" "}
            <Link href="/cabinet">кабинет</Link>.
          </p>
        </div>
        <div className="panel">
          <span className="panel__label">Условия</span>
          <h2>Оферта</h2>
          <p>
            Оплачивая тариф, вы подтверждаете принятие условий{" "}
            <Link href="/legal/offer">публичной оферты</Link>. Указывайте при
            оплате тот же email, что и в аккаунте платформы, — по нему команда
            привяжет платёж к вашему кейсу.
          </p>
        </div>
      </section>
    </div>
  );
}
