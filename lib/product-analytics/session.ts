import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { JOURNEY_MAX_AGE } from "./contract";

export function analyticsEnabled() {
  return process.env.PRODUCT_ANALYTICS_ENABLED === "true" && (process.env.PRODUCT_ANALYTICS_SECRET?.length ?? 0) >= 32;
}

function signature(value: string) {
  return createHmac("sha256", process.env.PRODUCT_ANALYTICS_SECRET ?? "").update(value).digest("hex");
}

export function newJourney(now = Date.now()) {
  if (!analyticsEnabled()) return null;
  const value = `${randomUUID()}.${Math.floor(now / 1000) + JOURNEY_MAX_AGE}`;
  return `${value}.${signature(value)}`;
}

export function readJourney(raw: string | undefined, now = Date.now()): string | null {
  if (!analyticsEnabled() || !raw) return null;
  const match = /^([0-9a-f-]{36})\.(\d{10})\.([0-9a-f]{64})$/.exec(raw);
  if (!match || Number(match[2]) <= now / 1000 || Number(match[2]) > now / 1000 + JOURNEY_MAX_AGE + 60) return null;
  const expected = signature(`${match[1]}.${match[2]}`);
  return timingSafeEqual(Buffer.from(match[3]), Buffer.from(expected)) ? match[1] : null;
}
