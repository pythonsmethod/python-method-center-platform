// Server-only configuration. A preview sharing a production key must never
// create a live Checkout Session, even when somebody enables its feature flag.
export function getCheckoutSettings(env: NodeJS.ProcessEnv = process.env) {
  return env.STRIPE_CHECKOUT_ENABLED === "true" ? getBillingSettings(env) : null;
}

// Existing customers retain access to cancellation when new sales are disabled.
export function getBillingSettings(env: NodeJS.ProcessEnv = process.env) {
  if (!env.STRIPE_WEBHOOK_SECRET?.trim()) return null;
  const key = env.STRIPE_SECRET_KEY?.trim() ?? "";
  const mode = env.STRIPE_CHECKOUT_MODE ?? "test";
  if (!/^(sk|rk)_test_/.test(key) && !/^(sk|rk)_live_/.test(key)) return null;
  if (mode !== "test" && mode !== "live") return null;
  if (key.includes("_live_") !== (mode === "live")) return null;
  if (mode === "live" && (env.NODE_ENV !== "production" ||
    (env.VERCEL_ENV !== undefined && env.VERCEL_ENV !== "production"))) return null;
  try {
    // Explicit per-environment origin: never silently return staging users to
    // production, and never accept a redirect destination supplied by a buyer.
    const url = new URL(env.STRIPE_CHECKOUT_RETURN_ORIGIN ?? "");
    const local = mode === "test" && ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return { origin: url.origin, livemode: mode === "live", automaticTax: env.STRIPE_CHECKOUT_AUTOMATIC_TAX === "true" };
  } catch {
    return null;
  }
}

export type CheckoutSettings = NonNullable<ReturnType<typeof getCheckoutSettings>>;
