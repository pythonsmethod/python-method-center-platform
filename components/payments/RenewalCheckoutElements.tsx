"use client";

import { CheckoutElementsProvider, PaymentElement, useCheckoutElements } from "@stripe/react-stripe-js/checkout";
import { loadStripe } from "@stripe/stripe-js";
import { useMemo, useState, type FormEvent } from "react";
import type { Locale } from "@/lib/i18n/locale";

type Props = {
  clientSecret: string;
  publishableKey: string;
  sessionId: string;
  months: number;
  locale: Locale;
  onBack: () => void;
};

const copy = {
  ru: {
    title: "Оплата персонального сопровождения",
    due: "Сегодня к оплате",
    term: (days: number) => `За ${days} дней сопровождения. Формула — в подарок на оплаченный период, доставка включена.`,
    renewal: "После оплаченного периода: 1 300 USD каждые 30 дней. Автопродление можно отключить до следующего списания.",
    pay: "Оплатить сейчас",
    paying: "Обрабатываем оплату…",
    back: "Вернуться к выбору",
    loading: "Загружаем защищённую форму оплаты…",
    error: "Не удалось открыть форму оплаты. Вернитесь к выбору и попробуйте ещё раз.",
    pending: "Платёж ещё не подтверждён. Проверьте его состояние перед повторной попыткой."
  },
  en: {
    title: "Personal Support payment",
    due: "Due today",
    term: (days: number) => `For ${days} days of support. Formula is complimentary for the paid period; delivery is included.`,
    renewal: "After the paid period: USD 1,300 every 30 days. You can turn off renewal before the next charge.",
    pay: "Pay now",
    paying: "Processing payment…",
    back: "Back to selection",
    loading: "Loading the secure payment form…",
    error: "The payment form could not be opened. Go back and try again.",
    pending: "Payment has not been confirmed yet. Check its status before trying again."
  }
} as const;

function RenewalPaymentForm({ sessionId, months, locale, onBack }: Pick<Props, "sessionId" | "months" | "locale" | "onBack">) {
  const state = useCheckoutElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = copy[locale];

  if (state.type === "loading") return <p role="status">{t.loading}</p>;
  if (state.type === "error") return <p role="alert">{t.error}</p>;

  const { checkout } = state;
  const amount = checkout.total.total.amount;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (processing || !checkout.canConfirm) return;
    setProcessing(true);
    setError(null);
    try {
      const result = await checkout.confirm({ redirect: "if_required" });
      if (result.type === "error") {
        setError(result.error.message);
      } else if (result.session.status.type === "complete" && result.session.status.paymentStatus === "paid") {
        const route = locale === "en" ? "/en/payment/success" : "/payment/success";
        window.location.assign(`${route}?session_id=${encodeURIComponent(sessionId)}`);
        return;
      } else {
        setError(t.pending);
      }
    } catch {
      setError(t.error);
    }
    setProcessing(false);
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      <p className="price-line">{t.due}: {amount}</p>
      <p>{t.term(months * 30)}</p>
      <p>{t.renewal}</p>
      <PaymentElement options={{ layout: "accordion" }} />
      {error ? <p role="alert">{error}</p> : null}
      <div className="panel-actions">
        <button className="button" type="submit" disabled={!checkout.canConfirm || processing} aria-busy={processing}>
          {processing ? t.paying : t.pay}
        </button>
        <button className="button button--secondary" type="button" onClick={onBack} disabled={processing}>
          {t.back}
        </button>
      </div>
    </form>
  );
}

export function RenewalCheckoutElements(props: Props) {
  const stripe = useMemo(() => loadStripe(props.publishableKey), [props.publishableKey]);
  const t = copy[props.locale];
  return (
    <section className="panel personal-support-plan" aria-label={t.title}>
      <h2>{t.title}</h2>
      <CheckoutElementsProvider stripe={stripe} options={{ clientSecret: props.clientSecret }}>
        <RenewalPaymentForm sessionId={props.sessionId} months={props.months} locale={props.locale} onBack={props.onBack} />
      </CheckoutElementsProvider>
    </section>
  );
}
