// Alternative payment methods, configured by the founder without code.
//
// Each block appears on /payment/other only when its environment variable
// is filled in. Nothing is invented here: if the center has no crypto
// wallet, the crypto block simply does not exist, and the visitor sees the
// request form instead of a promise no one can keep.
//
// Only the id and the details live here. The title and the explanation are
// copy, and copy belongs in the dictionary — these strings used to be
// hardcoded in Russian, so an English visitor whose card had just been
// declined was shown the way out in a language they might not read.

export type AltPaymentMethodId = "bank" | "crypto" | "paypal" | "wise" | "other";

export type AltPaymentBlock = {
  id: AltPaymentMethodId;
  details: string;
};

const SOURCES: Array<{ id: AltPaymentMethodId; env: string }> = [
  { id: "bank", env: "PAYMENT_ALT_BANK" },
  { id: "crypto", env: "PAYMENT_ALT_CRYPTO" },
  { id: "paypal", env: "PAYMENT_ALT_PAYPAL" },
  { id: "wise", env: "PAYMENT_ALT_WISE" },
  { id: "other", env: "PAYMENT_ALT_OTHER" }
];

export function getAltPaymentBlocks(): AltPaymentBlock[] {
  const blocks: AltPaymentBlock[] = [];

  for (const source of SOURCES) {
    const details = process.env[source.env]?.trim();

    if (details) {
      blocks.push({ id: source.id, details });
    }
  }

  return blocks;
}
