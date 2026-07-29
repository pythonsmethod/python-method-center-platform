// Alternative payment methods, configured by the founder without code.
//
// Each block appears on /payment/other only when its environment variable
// is filled in. Nothing is invented here: if the center has no crypto
// wallet, the crypto block simply does not exist, and the visitor sees the
// request form instead of a promise no one can keep.

export type AltPaymentBlock = {
  id: string;
  title: string;
  hint: string;
  details: string;
};

const SOURCES: Array<{ id: string; env: string; title: string; hint: string }> = [
  {
    id: "bank",
    env: "PAYMENT_ALT_BANK",
    title: "Банковский перевод",
    hint: "Перевод по реквизитам. Обычно зачисляется за 1–3 рабочих дня. В назначении платежа укажите email, которым вы регистрировались."
  },
  {
    id: "crypto",
    env: "PAYMENT_ALT_CRYPTO",
    title: "Криптовалюта",
    hint: "Подходит там, где карты не проходят. После перевода пришлите нам хеш транзакции — так мы найдём ваш платёж."
  },
  {
    id: "paypal",
    env: "PAYMENT_ALT_PAYPAL",
    title: "PayPal",
    hint: "Отправляйте с того email, которым регистрировались, — так платёж привяжется к вашему кейсу быстрее."
  },
  {
    id: "wise",
    env: "PAYMENT_ALT_WISE",
    title: "Wise / Revolut",
    hint: "Международный перевод с низкой комиссией. Работает в большинстве стран."
  },
  {
    id: "other",
    env: "PAYMENT_ALT_OTHER",
    title: "Ещё один способ",
    hint: "Дополнительный способ оплаты, настроенный командой центра."
  }
];

export function getAltPaymentBlocks(): AltPaymentBlock[] {
  const blocks: AltPaymentBlock[] = [];

  for (const source of SOURCES) {
    const details = process.env[source.env]?.trim();

    if (details) {
      blocks.push({
        id: source.id,
        title: source.title,
        hint: source.hint,
        details
      });
    }
  }

  return blocks;
}
