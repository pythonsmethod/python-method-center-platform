export type PaymentPlan = {
  product: "support_5_weeks" | "support_15_weeks";
  title: string;
  description: string;
  paymentLinkUrl: string | null;
};

function readPaymentLink(value: string | undefined): string | null {
  const url = value?.trim();

  if (!url || !url.startsWith("https://")) {
    return null;
  }

  return url;
}

export function getPaymentPlans(): PaymentPlan[] {
  return [
    {
      product: "support_5_weeks",
      title: "Сопровождение — 5 недель",
      description:
        "Ограниченный период сопровождения кейса командой Python Method: разбор ситуации, план и поддержка на 5 недель.",
      paymentLinkUrl: readPaymentLink(
        process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_5W
      )
    },
    {
      product: "support_15_weeks",
      title: "Сопровождение — 15 недель",
      description:
        "Расширенный период сопровождения кейса командой Python Method с поддержкой на 15 недель.",
      paymentLinkUrl: readPaymentLink(
        process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_15W
      )
    }
  ];
}
